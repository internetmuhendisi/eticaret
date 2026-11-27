// Fiyat girişinin değişikliği gerçek veritabanıyla (kart 0326, karar 0201):
// - Çevirme ve geri çevirme: müşterinin gördüğü fiyat (vitrin gösterimi) aynı kalır; yalnız önizlemenin söylediği
//   birimler 1 kuruş değişir. Vergisiz ürün ve onluk sınıftaki ürün kendi oranıyla; kargo ücreti kargo sınıfıyla,
//   ücretsiz kargo sınırı ve kupon tutarları (kullanılmış kupon da) en çok ürünü olan sınıfla çevrilir.
// - Fiyat geçmişi değişmez, çevrilen fiyatlar yeni satırdır; eski fiyat (30 gün) eski girişle yazılmış satırları
//   bugünkü girişe çevirerek bulur.
// - Önizleme hiçbir şey yazmaz; aynı giriş ve bölgesi bulunamayan mağaza iş kuralı hatasıdır.
// - Yarıda kalan işlem hiçbir şey bırakmaz; açık duran fiyat yazımının arkasında kilitte bekleyen değişiklik,
//   önizlemeden sonra değişen fiyatı görünce çakışma verir (sıra kurularak).
// - Verilen sipariş değişmez; başka site değişmez; fiyat girişi genel ayar değiştirmeyle değişmez.
import { randomUUID } from "node:crypto";
import { join, resolve } from "node:path";
import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type Site, siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import { baglantiyiKapat, type Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { kilitBekleyeniGor } from "../../../veritabani/testler/kilit-bekleyen.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { kuponKullanimlari, kuponlar } from "../../kampanya/model.ts";
import { kuponServisi } from "../../kampanya/servis.ts";
import { siteninServisi } from "../../magaza-ayarlari/servis.ts";
import { odemeOturumlari } from "../../odeme/model.ts";
import { urunKilidiAl } from "../../urun/kilit.ts";
import { urunServisi } from "../../urun/servis.ts";
import { vergiAyarlariniDegistir, vergiAyarlariniOku } from "../../vergi/ayarlar.ts";
import { siteninVergiServisi } from "../../vergi/servis.ts";
import { yeniGiriseCevir } from "../giris-cevirisi.ts";
import { fiyatGirisiServisi, gorunenDegisirMi, satirinGirisi } from "../giris-degisikligi.ts";
import { fiyatGosterimServisi } from "../gosterim.ts";
import { birimFiyatlari, fiyatGecmisi, fiyatGirisiGecmisi } from "../model.ts";
import { siteninFiyatServisi } from "../servis.ts";

vi.setConfig({ testTimeout: 120_000 });

const klasor = siteKlasorunuOku(
  join(resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler"), "vergi-dolu"),
);
const magazaAdresi = {
  ulke: "TR",
  il: "TR-06",
  ilce: "TR-06-007",
  adres: "Deneme Sokak No: 1",
  postaKodu: "06420",
};
const site: Site = {
  ...klasor,
  baslangic: {
    ...klasor.baslangic,
    vergiAdi: "Deneme vergisi",
    magazaAdresi,
    kargoUcreti: 5900,
    ucretsizKargoSiniri: 50000,
    indirimdeEnDusukFiyat: true,
  },
};
const ortak = globalThis as Record<symbol, unknown>;
const siteAnahtari = Symbol.for("cekirdek.calisanSite");
const temizlenecekler: (() => Promise<void>)[] = [];
beforeEach(() => {
  ortak[siteAnahtari] = site;
});
afterEach(async () => {
  delete ortak[siteAnahtari];
  await baglantiyiKapat();
  for (const temizle of temizlenecekler.splice(0)) await temizle();
});

const kim = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

// Ödeme oturumu; bitiş şimdiden bu kadar sonra (eksi: bitmiş).
const oturumAc = async (vt: Veritabani, bitis: number) => {
  const [oturum] = await vt
    .insert(odemeOturumlari)
    .values({
      eposta: "kisi@ornek.test",
      teslimat: {} as never,
      fatura: {} as never,
      kalemler: [],
      toplam: 0,
      para_birimi: site.ayarlar.paraBirimi,
      onaylar: [],
      olusturma_zamani: new Date(Date.now() - 3_600_000),
      bitis_zamani: new Date(Date.now() + bitis),
    })
    .returning({ kimlik: odemeOturumlari.kimlik });
  return oturum;
};

const hazirla = async (secilen: Site = site) => {
  const deneme = await denemeSitesiAc("giris");
  temizlenecekler.push(deneme.sil);
  const vt = deneme.vt;
  const vergi = siteninVergiServisi(secilen);
  const tablo = await vergi.tabloyuOku(vt);
  const genel = tablo.find((s) => s.ad === "Genel")?.kimlik ?? "";
  // İkinci sınıf (Onluk, yüzde on) ve kargonun sınıfı.
  const onluk = await vergi.sinifEkle(vt, kim(), { ad: "Onluk" });
  await vergi.oranEkle(vt, kim(), onluk, { ulke: "TR", oran: "10" });
  await vergiAyarlariniDegistir(vt, secilen, kim(), {
    ...(await vergiAyarlariniOku(vt, secilen)),
    kargoSinifi: genel,
    fiyatEkMetniTuru: "otomatik",
  });
  const urunler = urunServisi(() => secilen.ayarlar.saatDilimi);
  const fiyat = siteninFiyatServisi(secilen);
  const urunAc = async (
    satis: number,
    sinif: string | null,
    indirimli: number | null = null,
  ): Promise<string> => {
    const urun = await urunler.urunEkle(vt, kim(), {
      ad: `Ürün ${randomUUID().slice(0, 8)}`,
      vergiSinifi: sinif,
      durum: "yayinda",
    });
    const birim = (await urunler.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
    await fiyat.fiyatYaz(vt, kim(), birim, {
      satisFiyati: satis,
      ...(indirimli === null ? {} : { indirimliFiyat: indirimli }),
    });
    return birim;
  };
  const gorunen = async (birimler: string[]) => {
    const fiyatlar = await fiyatGosterimServisi(secilen).gosterilecekFiyatlar(vt, birimler);
    return birimler.map((b) => {
      const f = fiyatlar.get(b);
      return { tutar: f?.tutar, eski: f?.eskiTutar };
    });
  };
  const kayitli = async (birim: string) =>
    (await vt.select().from(birimFiyatlari).where(eq(birimFiyatlari.birim_kimligi, birim)))[0];
  const servis = fiyatGirisiServisi(secilen);
  return { vt, genel, onluk, urunAc, gorunen, kayitli, servis };
};

// Deneme sitesinin Genel sınıfının oranında vergi dahil bir tutar: hiçbir hariç tutar ona ulaşamıyorsa "dar".
const tablo18 = async (vt: Veritabani) => {
  const tablo = await siteninVergiServisi(site).tabloyuOku(vt, { silinmisSiniflar: true });
  const baglam = {
    ayarlar: {
      vergiAcik: true,
      fiyatGosterimi: "vergi-dahil" as const,
      vergiYuvarlama: "satir" as const,
    },
    tablo,
    magaza: { ulke: "TR", il: "TR-06", postaKodu: "06420" },
  };
  const genel = tablo.find((s) => s.ad === "Genel")?.kimlik ?? "";
  const dar: number[] = [];
  const tam: number[] = [];
  for (let tutar = 10_000; dar.length < 2 || tam.length < 2; tutar += 1) {
    const sonuc = yeniGiriseCevir(baglam, tutar, genel, "vergi-dahil", "vergi-haric");
    (sonuc.sonraGorunen === tutar ? tam : dar).push(tutar);
  }
  return { dar, tam };
};

describe("çevirme ve geri çevirme", () => {
  it("müşterinin gördüğü fiyat aynı kalır; yalnız önizlemenin söylediği birimler 1 kuruş değişir", async () => {
    const h = await hazirla();
    const { dar, tam } = await tablo18(h.vt);
    const [darTutar = 0] = dar;
    const [tamTutar = 0] = tam;
    const birimler = {
      tam: await h.urunAc(tamTutar, h.genel),
      dar: await h.urunAc(darTutar, h.genel),
      onluk: await h.urunAc(11_990, h.onluk, 9_990),
      vergisiz: await h.urunAc(7_777, null),
    };
    const liste = Object.values(birimler);
    const once = await h.gorunen(liste);
    const gecmisOnce = (await h.vt.select().from(fiyatGecmisi)).length;

    // Önizleme hiçbir şey yazmaz.
    const plan = await h.servis.onizle(h.vt, "vergi-haric");
    expect(plan.eski).toBe("vergi-dahil");
    const degisenler = plan.fiyatlar.filter(gorunenDegisirMi).map((f) => f.birim);
    expect(degisenler).toContain(birimler.dar);
    expect(degisenler).not.toContain(birimler.tam);
    expect(degisenler).not.toContain(birimler.vergisiz);
    expect((await h.vt.select().from(fiyatGirisiGecmisi)).length).toBe(0);
    expect((await siteninServisi(site).oku(h.vt)).fiyatGirisi).toBe("vergi-dahil");

    await h.servis.uygula(h.vt, kim(), { yeni: "vergi-haric", surum: plan.surum });
    const ayarlar = await siteninServisi(site).oku(h.vt);
    expect(ayarlar.fiyatGirisi).toBe("vergi-haric");
    const sonra = await h.gorunen(liste);
    // Görünen: tam, onluk sınıftaki (indirimli de) ve vergisiz aynı; dar en çok 1 kuruş.
    expect(sonra[0]).toEqual(once[0]);
    expect(sonra[2]).toEqual(once[2]);
    expect(sonra[3]).toEqual(once[3]);
    expect(Math.abs((sonra[1]?.tutar ?? 0) - (once[1]?.tutar ?? 0))).toBe(1);
    // Kayıtlı: vergisiz ürün değişmez, onluk sınıftaki ürün kendi oranıyla (11.990 / 1,10 ≈ 10.900).
    expect((await h.kayitli(birimler.vergisiz))?.satis_fiyati).toBe(7_777);
    expect((await h.kayitli(birimler.onluk))?.satis_fiyati).toBe(10_900);
    expect((await h.kayitli(birimler.onluk))?.indirimli_fiyat).toBe(9_082);
    // Geçmiş: değişen üç birime yeni satır; eski satırlar duruyor.
    expect((await h.vt.select().from(fiyatGecmisi)).length).toBe(gecmisOnce + 3);
    // Kargo ücreti kargo sınıfının (Genel) oranıyla, sınır en çok ürünü olan sınıfın oranıyla.
    expect(ayarlar.kargoUcreti).toBe(5_000);
    expect(ayarlar.ucretsizKargoSiniri).toBe(42_373);
    // Değişiklik kaydı.
    const kayitlar = await h.vt
      .select({ islem: degisiklikKayitlari.islem })
      .from(degisiklikKayitlari)
      .where(eq(degisiklikKayitlari.islem, "fiyat-girisi.degisti"));
    expect(kayitlar).toHaveLength(1);

    // Geri çevirme: tam ve vergisiz yine aynı; görünen yine önceki.
    const geri = await h.servis.onizle(h.vt, "vergi-dahil");
    await h.servis.uygula(h.vt, kim(), { yeni: "vergi-dahil", surum: geri.surum });
    const geriSonra = await h.gorunen(liste);
    expect(geriSonra[0]).toEqual(once[0]);
    expect(geriSonra[2]).toEqual(once[2]);
    expect(geriSonra[3]).toEqual(once[3]);
    expect((await h.kayitli(birimler.tam))?.satis_fiyati).toBe(tamTutar);
    expect((await siteninServisi(site).oku(h.vt)).kargoUcreti).toBe(5_900);
    expect((await h.vt.select().from(fiyatGirisiGecmisi)).map((s) => s.yeni)).toEqual([
      "vergi-haric",
      "vergi-dahil",
    ]);
  });

  it("gösterim yeni girişle aynıysa hiçbir görünen fiyat değişmez: kayıtlı tutar görünen tutardır", async () => {
    const haricGosterim: Site = {
      ...site,
      baslangic: { ...site.baslangic, fiyatGosterimi: "vergi-haric" },
    };
    ortak[siteAnahtari] = haricGosterim;
    const h = await hazirla(haricGosterim);
    const { dar } = await tablo18(h.vt);
    const birimler = await Promise.all(dar.map((tutar) => h.urunAc(tutar, h.genel)));
    const once = await h.gorunen(birimler);
    const plan = await h.servis.onizle(h.vt, "vergi-haric");
    expect(plan.fiyatlar.filter(gorunenDegisirMi)).toEqual([]);
    await h.servis.uygula(h.vt, kim(), { yeni: "vergi-haric", surum: plan.surum });
    expect(await h.gorunen(birimler)).toEqual(once);
    expect((await h.kayitli(birimler[0] ?? ""))?.satis_fiyati).toBe(once[0]?.tutar);
  });

  it("eski fiyat (30 gün) eski girişle yazılmış satırları bugünkü girişe çevirerek bulur", async () => {
    const h = await hazirla();
    const birim = await h.urunAc(11_800, h.genel);
    await siteninFiyatServisi(site).fiyatYaz(h.vt, kim(), birim, {
      satisFiyati: 11_800,
      indirimliFiyat: 9_440,
    });
    const once = await h.gorunen([birim]);
    expect(once[0]).toEqual({ tutar: 9_440, eski: 11_800 });
    const plan = await h.servis.onizle(h.vt, "vergi-haric");
    await h.servis.uygula(h.vt, kim(), { yeni: "vergi-haric", surum: plan.surum });
    expect(await h.gorunen([birim])).toEqual(once);
    // Kayıtlı satış fiyatı hariç: 10.000; eski satırlar dahil kaldı (geçmiş değişmez).
    expect((await h.kayitli(birim))?.satis_fiyati).toBe(10_000);
    expect(
      (await h.vt.select().from(fiyatGecmisi).where(eq(fiyatGecmisi.birim_kimligi, birim))).map(
        (s) => s.satis_fiyati,
      ),
    ).toEqual(expect.arrayContaining([11_800, 10_000]));
  });
});

describe("bağımsız kontrolün bulguları", () => {
  it("seçiliyken silinen kargo sınıfı vergi hesabındaki gibi kargonun sınıfıdır: ücret onun oranıyla çevrilir", async () => {
    const h = await hazirla();
    const vergi = siteninVergiServisi(site);
    const kargoluk = await vergi.sinifEkle(h.vt, kim(), { ad: "Kargoluk" });
    await vergi.oranEkle(h.vt, kim(), kargoluk, { ulke: "TR", oran: "18" });
    await vergiAyarlariniDegistir(h.vt, site, kim(), {
      ...(await vergiAyarlariniOku(h.vt, site)),
      kargoSinifi: kargoluk,
    });
    await vergi.sinifSil(h.vt, kim(), kargoluk);
    await h.urunAc(11_800, h.genel);
    const plan = await h.servis.onizle(h.vt, "vergi-haric");
    await h.servis.uygula(h.vt, kim(), { yeni: "vergi-haric", surum: plan.surum });
    expect((await siteninServisi(site).oku(h.vt)).kargoUcreti).toBe(5_000);
  });

  it("indirimli fiyat satış fiyatına eşitlenince bir kuruş aşağı yazılır; önizleme müşterinin göreceğini söyler", async () => {
    const h = await hazirla();
    const tablo = await siteninVergiServisi(site).tabloyuOku(h.vt, { silinmisSiniflar: true });
    const baglam = {
      ayarlar: {
        vergiAcik: true,
        fiyatGosterimi: "vergi-dahil" as const,
        vergiYuvarlama: "satir" as const,
      },
      tablo,
      magaza: { ulke: "TR", il: "TR-06", postaKodu: "06420" },
    };
    // Satış ve indirimli fiyatı aynı tutara çevrilen ilk çift.
    let satis = 10_000;
    const cevir = (t: number) =>
      yeniGiriseCevir(baglam, t, h.genel, "vergi-dahil", "vergi-haric").tutar;
    while (cevir(satis) !== cevir(satis - 1)) satis += 1;
    const birim = await h.urunAc(satis, h.genel, satis - 1);
    const plan = await h.servis.onizle(h.vt, "vergi-haric");
    const satir = plan.fiyatlar.find((f) => f.birim === birim);
    expect(satir?.indirimli?.tutar).toBe((satir?.satis.tutar ?? 0) - 1);
    await h.servis.uygula(h.vt, kim(), { yeni: "vergi-haric", surum: plan.surum });
    const [gorunen] = await h.gorunen([birim]);
    expect(gorunen?.tutar).toBe(satir?.indirimli?.sonraGorunen);
  });

  it("mağaza adresi yokken eski girişle yazılmış geçmiş vitrini düşürmez", async () => {
    const h = await hazirla();
    const birim = await h.urunAc(11_800, h.genel);
    await siteninFiyatServisi(site).fiyatYaz(h.vt, kim(), birim, {
      satisFiyati: 11_800,
      indirimliFiyat: 9_440,
    });
    const plan = await h.servis.onizle(h.vt, "vergi-haric");
    await h.servis.uygula(h.vt, kim(), { yeni: "vergi-haric", surum: plan.surum });
    await siteninServisi(site).degistir(h.vt, kim(), { magazaAdresi: undefined });
    const [gorunen] = await h.gorunen([birim]);
    expect(gorunen?.tutar).toBeDefined();
  });
});

describe("kuponlar", () => {
  it("tutar kuponunun indirimi ve en az tutarı (kullanılmış kupon da) çevrilir, yüzde kuponun değeri değişmez", async () => {
    const h = await hazirla();
    await h.urunAc(11_800, h.genel);
    const servis = kuponServisi(site);
    const kupon = (girdi: Parameters<typeof servis.ekle>[2]) =>
      h.vt.transaction((islem) => servis.ekle(islem, kim(), girdi));
    const tutar = await kupon({
      kod: "TUTAR1",
      tur: "tutar",
      deger: 11_800,
      enAzTutar: 59_000,
      kapsam: "hepsi",
    });
    const yuzde = await kupon({ kod: "YUZDE1", tur: "yuzde", deger: 10, kapsam: "hepsi" });
    // Kullanılmış: süresi dolmamış ayırma (oturumun kendisi bitmiş: süren ödeme değişikliği durdururdu).
    const oturum = await oturumAc(h.vt, -60_000);
    await h.vt.insert(kuponKullanimlari).values({
      kupon_kimligi: tutar,
      oturum_kimligi: oturum?.kimlik ?? "",
      eposta: "kisi@ornek.test",
      bitis_zamani: new Date(Date.now() + 15 * 60_000),
    });
    // Kilit yerinde: kullanılmış kuponun değeri doğrudan değişmez.
    await expect(
      h.vt.update(kuponlar).set({ deger: 1 }).where(eq(kuponlar.kimlik, tutar)),
    ).rejects.toThrow();
    const plan = await h.servis.onizle(h.vt, "vergi-haric");
    await h.servis.uygula(h.vt, kim(), { yeni: "vergi-haric", surum: plan.surum });
    const [t] = await h.vt.select().from(kuponlar).where(eq(kuponlar.kimlik, tutar));
    const [y] = await h.vt.select().from(kuponlar).where(eq(kuponlar.kimlik, yuzde));
    expect([t?.deger, t?.en_az_tutar]).toEqual([10_000, 50_000]);
    expect(y?.deger).toBe(10);
    // İşlemden sonra kilit yine yerinde.
    await expect(
      h.vt.update(kuponlar).set({ deger: 1 }).where(eq(kuponlar.kimlik, tutar)),
    ).rejects.toThrow();
  });
});

describe("hatalar, yarış ve ayrım", () => {
  it("aynı giriş ve bölgesi bulunamayan mağaza iş kuralı; fiyat girişi genel ayar değiştirmeyle değişmez", async () => {
    const h = await hazirla();
    await h.urunAc(11_800, h.genel);
    await expect(h.servis.onizle(h.vt, "vergi-dahil")).rejects.toMatchObject({
      kod: "is-kurali",
      ayrinti: [{ alan: "yeni", kod: "ayni-giris" }],
    });
    await expect(
      siteninServisi(site).degistir(h.vt, kim(), { fiyatGirisi: "vergi-haric" }),
    ).rejects.toThrow();
    const yurtdisi: Site = { ...site, baslangic: { ...site.baslangic, magazaAdresi: undefined } };
    const h2 = await hazirla(yurtdisi);
    await h2.urunAc(11_800, h2.genel);
    await expect(h2.servis.onizle(h2.vt, "vergi-haric")).rejects.toMatchObject({
      kod: "is-kurali",
      ayrinti: [{ alan: "yeni", kod: "vergi-bolgesi-yok" }],
    });
  });

  it("süren ödeme varken uygulanmaz, bitince uygulanır", async () => {
    const h = await hazirla();
    await h.urunAc(11_800, h.genel);
    const oturum = await oturumAc(h.vt, 15 * 60_000);
    const plan = await h.servis.onizle(h.vt, "vergi-haric");
    await expect(
      h.servis.uygula(h.vt, kim(), { yeni: "vergi-haric", surum: plan.surum }),
    ).rejects.toMatchObject({ kod: "is-kurali", ayrinti: [{ alan: "yeni", kod: "acik-odeme" }] });
    expect((await siteninServisi(site).oku(h.vt)).fiyatGirisi).toBe("vergi-dahil");
    await h.vt
      .update(odemeOturumlari)
      .set({ bitis_zamani: new Date(Date.now() - 1_000) })
      .where(eq(odemeOturumlari.kimlik, oturum?.kimlik ?? ""));
    await h.servis.uygula(h.vt, kim(), { yeni: "vergi-haric", surum: plan.surum });
    expect((await siteninServisi(site).oku(h.vt)).fiyatGirisi).toBe("vergi-haric");
  });

  it("yarıda kalan işlem hiçbir şey bırakmaz", async () => {
    const h = await hazirla();
    const birim = await h.urunAc(11_800, h.genel);
    const plan = await h.servis.onizle(h.vt, "vergi-haric");
    const gecmisOnce = (await h.vt.select().from(fiyatGecmisi)).length;
    // Fiyatlar yazıldıktan sonra ayarın yazımı düşer.
    await h.vt.execute(sql`
      create function deneme_ayar_dusur() returns trigger language plpgsql as $$
      begin raise exception 'deneme: ayar yazılamadı'; end; $$;
      create trigger deneme_ayar_dusur before update on magaza_ayarlari
      for each statement execute function deneme_ayar_dusur();
    `);
    await expect(
      h.servis.uygula(h.vt, kim(), { yeni: "vergi-haric", surum: plan.surum }),
    ).rejects.toThrow();
    expect((await h.kayitli(birim))?.satis_fiyati).toBe(11_800);
    expect((await h.vt.select().from(fiyatGecmisi)).length).toBe(gecmisOnce);
    expect(await h.vt.select().from(fiyatGirisiGecmisi)).toEqual([]);
    await h.vt.execute(sql`drop trigger deneme_ayar_dusur on magaza_ayarlari`);
    expect((await siteninServisi(site).oku(h.vt)).fiyatGirisi).toBe("vergi-dahil");
  });

  it("açık duran fiyat yazımının arkasında bekleyen değişiklik, sonra yazılan fiyatı görüp çakışma verir", async () => {
    const h = await hazirla();
    const birim = await h.urunAc(11_800, h.genel);
    const plan = await h.servis.onizle(h.vt, "vergi-haric");
    let kilitAlindi: () => void = () => undefined;
    const alindi = new Promise<void>((tamam) => {
      kilitAlindi = tamam;
    });
    let birak: () => void = () => undefined;
    const bekle = new Promise<void>((tamam) => {
      birak = tamam;
    });
    const yazim = h.vt.transaction(async (islem) => {
      await urunKilidiAl(islem);
      await siteninFiyatServisi(site).fiyatYaz(islem, kim(), birim, { satisFiyati: 12_900 });
      kilitAlindi();
      await bekle;
    });
    await Promise.race([alindi, yazim]);
    const degisiklik = h.servis.uygula(h.vt, kim(), { yeni: "vergi-haric", surum: plan.surum });
    await kilitBekleyeniGor(h.vt);
    birak();
    await yazim;
    await expect(degisiklik).rejects.toMatchObject({ kod: "cakisma" });
    expect((await siteninServisi(site).oku(h.vt)).fiyatGirisi).toBe("vergi-dahil");
    expect((await h.kayitli(birim))?.satis_fiyati).toBe(12_900);
  });

  it("verilen siparişe ve başka siteye dokunmaz; satırın girişi değişikliklerden bulunur", async () => {
    const a = await hazirla();
    const b = await hazirla();
    const birimA = await a.urunAc(11_800, a.genel);
    const birimB = await b.urunAc(11_800, b.genel);
    const siparisler = async (vt: Veritabani) =>
      (await vt.execute(sql`select kimlik, toplam from siparisler order by kimlik`)).rows;
    const siparisOnce = await siparisler(a.vt);
    const plan = await a.servis.onizle(a.vt, "vergi-haric");
    await a.servis.uygula(a.vt, kim(), { yeni: "vergi-haric", surum: plan.surum });
    expect(await siparisler(a.vt)).toEqual(siparisOnce);
    expect((await a.kayitli(birimA))?.satis_fiyati).toBe(10_000);
    expect((await b.kayitli(birimB))?.satis_fiyati).toBe(11_800);
    expect((await siteninServisi(site).oku(b.vt)).fiyatGirisi).toBe("vergi-dahil");

    const t = (s: string) => new Date(`2026-11-0${s}T00:00:00Z`);
    const degisiklikler = [
      { zaman: t("2"), onceki: "vergi-dahil", yeni: "vergi-haric" },
      { zaman: t("4"), onceki: "vergi-haric", yeni: "vergi-dahil" },
    ] as const;
    expect(satirinGirisi(t("1"), degisiklikler, "vergi-dahil")).toBe("vergi-dahil");
    expect(satirinGirisi(t("2"), degisiklikler, "vergi-dahil")).toBe("vergi-haric");
    expect(satirinGirisi(t("3"), degisiklikler, "vergi-dahil")).toBe("vergi-haric");
    expect(satirinGirisi(t("5"), degisiklikler, "vergi-dahil")).toBe("vergi-dahil");
    expect(satirinGirisi(t("1"), [], "vergi-haric")).toBe("vergi-haric");
  });
});
