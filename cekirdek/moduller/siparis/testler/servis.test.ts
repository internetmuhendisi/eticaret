// Sipariş gerçek veritabanıyla (kart 0214, karar 0141):
// - "Siparişi onayla" oturumu, ayırmayı ve siparişi tek işlemde yazar; sipariş sipariş anındaki ürün adını, seçimi,
//   stok kodunu, birim fiyatı, vergi oranını ve tutarını, kargoyu, toplamı, adresleri, notu, onayları ve ödeme
//   yöntemini saklar; ürün, fiyat ve vergi sonradan değişince sipariş değişmez. Stok düşer, ayırma siparişe geçer,
//   geçmişe "olusturuldu" yazılır.
// - Aynı anda iki siparişte son ürün bir kez satılır; başka ödemenin süresi dolmamış ayırması stoktan düşülmüş sayılır
//   (süresi dolan sayılmaz); açık duran siparişin arkasındaki sipariş stok satırının kilidinde bekler.
// - Numara sitenin önekiyle ve başlangıç ayarından başlar, aynı anda gelen siparişlerde tekrar etmez.
// - Kapalı yöntemle (kapalı yöntem, kapalı seçenek, banka hesabı olmayan havale) sipariş verilmez, hiçbir şey yazılmaz.
// - Havale süresi dolunca bir kez iptal olur, stok o siparişin düşürdüğü kadar döner; süresinden önce ve bildirimliyken
//   iptal olmaz; aynı anda iki tarama tek iptal yapar.
// - Havale bildirimi: numara ve e-posta (ya da üyenin hesabı) eşleşmezse bulunamadı, kapıda ödemeli siparişe yazılmaz,
//   tutar, gün ve hesap denetlenir.
// - Sipariş alındı sayfası yalnız erişim anahtarıyla okur; iki site birbirinin siparişini görmez.
// - Siparişe dönen oturum temizlikte ve müşterinin yeniden onayında silinmez; geçmiş değiştirilemez; veritabanının
//   durum, neden ve yöntem denetimleri kayıtla aynıdır.
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { eq, sql } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type Site, siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import { kapidaOdemeSecenekleri, odemeYontemleri } from "../../../kayitlar/odeme.ts";
import { siparisDurumlari, siparisGecmisiNedenleri } from "../../../kayitlar/siparis.ts";
import { baglantiyiKapat, type Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { kilitBekleyeniGor } from "../../../veritabani/testler/kilit-bekleyen.ts";
import { siteninFiyatServisi } from "../../fiyat/servis.ts";
import { odemeOturumlari } from "../../odeme/model.ts";
import { type OdemeYontemiSecimi, odemeBilgileriSemasi } from "../../odeme/semalar.ts";
import { type OdemeGirdisi, odemeServisi } from "../../odeme/servis.ts";
import { eskiOdemeOturumlariniSil } from "../../odeme/temizlik.ts";
import { odemeYontemiServisi } from "../../odeme/yontemler.ts";
import { hesapAc } from "../../oturum/servis.ts";
import { sepetiHesapla } from "../../sepet/hesap.ts";
import { birimStoklari, stokAyirmalari, stokGecmisi } from "../../stok/model.ts";
import { stokServisi } from "../../stok/servis.ts";
import { urunServisi } from "../../urun/servis.ts";
import { siteninVergiServisi } from "../../vergi/servis.ts";
import { havaleBildirimleri, siparisGecmisi, siparisKalemleri, siparisler } from "../model.ts";
import { havaleBildirimiFormuSemasi } from "../semalar.ts";
import { siparisServisi } from "../servis.ts";

vi.setConfig({ testTimeout: 90_000 });

const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

const klasor = siteKlasorunuOku(
  resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler/vergi-dolu"),
);
const hesapKimligi = randomUUID();
const site: Site = {
  ...klasor,
  baslangic: {
    ...klasor.baslangic,
    vergiAdi: "Deneme vergisi",
    magazaAdresi: {
      ulke: "TR",
      il: "TR-06",
      ilce: "TR-06-007",
      adres: "Deneme Sokak No: 1",
      postaKodu: "06000",
    },
    odemeYontemleri: [
      { kod: "havale", acik: true },
      { kod: "kapida-odeme", acik: true },
    ],
    kapidaOdemeSecenekleri: ["nakit", "kart"],
    havaleIptalSuresi: 3,
    bankaHesaplari: [
      {
        kimlik: hesapKimligi,
        banka: "Deneme Bankası",
        sahip: "Deneme Ticaret",
        iban: "TR420001000000000000000001",
      },
    ],
  },
};
const odeme = odemeServisi(site);
const siparis = siparisServisi(site);
const urunSrv = urunServisi(() => site.ayarlar.saatDilimi);
const fiyat = siteninFiyatServisi(site);
const stok = stokServisi();
const oturumSuresi = 3600;

const temizlenecekler: (() => Promise<void>)[] = [];
afterEach(async () => {
  await baglantiyiKapat();
  for (const temizle of temizlenecekler.splice(0)) await temizle();
});

const hazirla = async () => {
  const deneme = await denemeSitesiAc("siparis");
  temizlenecekler.push(deneme.sil);
  const vt = deneme.vt;
  const tablo = await siteninVergiServisi(site).tabloyuOku(vt);
  const genel = tablo.find((sinif) => sinif.ad === "Genel")?.kimlik;
  if (genel === undefined) throw new Error("Genel sınıf yok.");
  const urunAc = async ({ miktar = 50, takip = true, satis = 11_800, stokKodu = "" } = {}) => {
    const urun = await urunSrv.urunEkle(vt, yonetici(), {
      ad: `Ürün ${randomUUID().slice(0, 8)}`,
      vergiSinifi: genel,
      durum: "yayinda",
      stokTakibi: takip,
      ...(stokKodu === "" ? {} : { stokKodu }),
    });
    const birim = (await urunSrv.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
    await fiyat.fiyatYaz(vt, yonetici(), birim, { satisFiyati: satis });
    if (miktar > 0 && takip) {
      await stok.stokDuzelt(vt, yonetici(), birim, {
        yeniMiktar: miktar,
        gorulenMiktar: 0,
        sebep: "sayim",
      });
    }
    return { urun, birim };
  };
  const miktar = async (birim: string) =>
    (
      await vt
        .select({ miktar: birimStoklari.miktar })
        .from(birimStoklari)
        .where(eq(birimStoklari.birim_kimligi, birim))
    )[0]?.miktar;
  const musteriAc = async () =>
    (
      await hesapAc(vt, "musteri", {
        eposta: `uye-${randomUUID().slice(0, 8)}@ornek.test`,
        sifre: "uzun-bir-sifre-123",
      })
    ).hesapKimligi;
  return { vt, urunAc, miktar, musteriAc, genel };
};

const teslimat = {
  ad: "Deniz",
  soyad: "Yılmaz",
  telefon: "0555 000 00 00",
  adres: {
    ulke: "TR",
    il: "TR-06",
    ilce: "TR-06-007",
    adres: "Atatürk Bulvarı No: 10",
    postaKodu: "06420",
  },
};

const bilgiler = (odemeYontemi: OdemeYontemiSecimi = { yontem: "havale" }, ek = {}) =>
  odemeBilgileriSemasi.parse({
    odemeYontemi,
    teslimat,
    fatura: { tur: "bireysel", adresAyni: true },
    onBilgilendirmeOnayi: true,
    mesafeliSatisOnayi: true,
    pazarlamaIzni: false,
    ...ek,
  });

const misafir = (eposta = "misafir@ornek.test"): OdemeGirdisi["kim"] => ({
  tur: "misafir",
  eposta,
  hesap: { ac: false },
});

const ver = (vt: Veritabani, kalemler: OdemeGirdisi["kalemler"], ek: Partial<OdemeGirdisi> = {}) =>
  odeme.siparisVer(vt, { kim: misafir(), bilgiler: bilgiler(), kalemler, ...ek }, oturumSuresi);

const hatasi = async (is: Promise<unknown>) => {
  try {
    await is;
  } catch (hata) {
    if (hata instanceof BilinenHata) return { kod: hata.kod, ayrinti: hata.ayrinti };
    throw hata;
  }
  throw new Error("Hata bekleniyordu.");
};

const bildirim = (numara: string, ek: Record<string, unknown> = {}) =>
  havaleBildirimiFormuSemasi.parse({
    numara,
    gonderen: "Deniz Yılmaz",
    hesap: hesapKimligi,
    tutar: "100,00",
    odemeTarihi: new Date().toISOString().slice(0, 10),
    ...ek,
  });

describe("sipariş", () => {
  it("oturum, sipariş ve kalemler sipariş anının değerleriyle yazılır; ürün değişince sipariş değişmez", async () => {
    const h = await hazirla();
    const a = await h.urunAc({ satis: 11_800, stokKodu: "A-1" });
    const b = await h.urunAc({ satis: 5_900 });
    const sonuc = await ver(h.vt, [
      { birim: a.birim, adet: 2 },
      { birim: b.birim, adet: 1 },
    ]);
    expect(sonuc.siparis.numara).toBe(
      `${site.ayarlar.siparisOneki}-${site.ayarlar.siparisBaslangici}`,
    );
    expect(sonuc.siparis.erisimAnahtari).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    const [kayit] = await h.vt.select().from(siparisler);
    expect(kayit).toMatchObject({
      numara: sonuc.siparis.numara,
      oturum_kimligi: sonuc.oturum,
      musteri_kimligi: null,
      eposta: "misafir@ornek.test",
      odeme_yontemi: "havale",
      kapida_secenegi: null,
      durum: "odeme-bekleniyor",
      para_birimi: site.ayarlar.paraBirimi,
      ara_toplam: 2 * 11_800 + 5_900,
      kargo_tutari: 0,
      toplam: 2 * 11_800 + 5_900,
    });
    expect(kayit?.teslimat.ad).toBe("Deniz");
    expect(kayit?.onaylar.map((onay) => onay.tur)).toEqual([
      "on-bilgilendirme",
      "mesafeli-satis",
      "pazarlama",
    ]);
    expect(kayit?.vergi_toplami).toBeGreaterThan(0);
    expect(kayit?.vergi_dokumu.every((satir) => satir.ad !== undefined)).toBe(true);
    // Havalenin son anı veritabanının saatiyle şimdi artı üç gün.
    const fark =
      (kayit?.odeme_son_zamani?.getTime() ?? 0) - (kayit?.olusturma_zamani.getTime() ?? 0);
    expect(fark).toBe(3 * 24 * 60 * 60 * 1000);
    // Anahtarın kendisi saklanmaz.
    expect(kayit?.erisim_ozeti).not.toContain(sonuc.siparis.erisimAnahtari);

    const kalemler = await h.vt.select().from(siparisKalemleri).orderBy(siparisKalemleri.sira);
    expect(
      kalemler.map((kalem) => [kalem.birim_kimligi, kalem.adet, kalem.birim_tutari, kalem.tutar]),
    ).toEqual([
      [a.birim, 2, 11_800, 23_600],
      [b.birim, 1, 5_900, 5_900],
    ]);
    expect(kalemler[0]?.stok_kodu).toBe("A-1");
    expect(kalemler[0]?.vergi).toBeGreaterThan(0);
    expect(kalemler[0]?.vergisiz).toBe(23_600 - (kalemler[0]?.vergi ?? 0));
    expect(kalemler[0]?.vergi_oranlari[0]).toMatchObject({ ad: "Deneme vergisi" });
    const ad = kalemler[0]?.urun_adi;

    // Stok düştü, ayırma siparişe geçti, geçmiş yazıldı.
    expect(await h.miktar(a.birim)).toBe(48);
    expect(await h.vt.select().from(stokAyirmalari)).toEqual([]);
    const dusme = await h.vt
      .select()
      .from(stokGecmisi)
      .where(eq(stokGecmisi.kaynak_kimligi, kayit?.kimlik ?? ""));
    expect(dusme.map((satir) => satir.sebep).toSorted()).toEqual(["siparis", "siparis"]);
    const gecmis = await h.vt.select().from(siparisGecmisi);
    expect(gecmis).toMatchObject([
      {
        onceki_durum: null,
        sonraki_durum: "odeme-bekleniyor",
        neden: "olusturuldu",
        kim_turu: "sistem",
      },
    ]);

    // Ürünün adı ve fiyatı değişir: sipariş aynı kalır.
    await urunSrv.urunDegistir(h.vt, yonetici(), a.urun, { ad: "Yeni ad" });
    await fiyat.fiyatYaz(h.vt, yonetici(), a.birim, { satisFiyati: 99_900 });
    const [sonra] = await h.vt
      .select()
      .from(siparisKalemleri)
      .where(eq(siparisKalemleri.birim_kimligi, a.birim));
    expect(sonra?.urun_adi).toBe(ad);
    expect(sonra?.birim_tutari).toBe(11_800);
  });

  it("kapıda ödeme seçeneğiyle, üyenin hesabıyla sipariş; önceki teslimat önerilir", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    const musteri = await h.musteriAc();
    expect(await siparis.sonTeslimat(h.vt, musteri)).toBeNull();
    await odeme.siparisVer(
      h.vt,
      {
        kim: { tur: "uye", musteri },
        bilgiler: bilgiler({ yontem: "kapida-odeme", secenek: "kart" }),
        kalemler: [{ birim: a.birim, adet: 1 }],
      },
      oturumSuresi,
    );
    const [kayit] = await h.vt.select().from(siparisler);
    expect(kayit).toMatchObject({
      musteri_kimligi: musteri,
      odeme_yontemi: "kapida-odeme",
      kapida_secenegi: "kart",
      odeme_son_zamani: null,
    });
    const [gecmis] = await h.vt.select().from(siparisGecmisi);
    expect(gecmis).toMatchObject({ kim_turu: "musteri", kim_kimligi: musteri });
    expect(await siparis.sonTeslimat(h.vt, musteri)).toMatchObject({ ad: "Deniz" });
    // Başka müşterinin önerisi boştur.
    expect(await siparis.sonTeslimat(h.vt, await h.musteriAc())).toBeNull();
  });

  it("kapalı yöntem, kapalı seçenek ve banka hesabı olmayan havale sipariş vermez, hiçbir şey yazılmaz", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    const yontemler = odemeYontemiServisi(site);
    await yontemler.yontemleriDegistir(h.vt, yonetici(), {
      yontemler: [
        { kod: "havale", acik: true },
        { kod: "kapida-odeme", acik: false },
      ],
      kapidaOdemeSecenekleri: ["nakit"],
      havaleIptalSuresi: "3",
    });
    const kapali = await hatasi(
      odeme.siparisVer(
        h.vt,
        {
          kim: misafir(),
          bilgiler: bilgiler({ yontem: "kapida-odeme", secenek: "nakit" }),
          kalemler: [{ birim: a.birim, adet: 1 }],
        },
        oturumSuresi,
      ),
    );
    expect(kapali).toEqual({
      kod: "is-kurali",
      ayrinti: [{ alan: "bilgiler.odemeYontemi", kod: "yontem-kapali" }],
    });
    // Kapıda ödeme açık, kart seçeneği kapalı.
    await yontemler.yontemleriDegistir(h.vt, yonetici(), {
      yontemler: [
        { kod: "kapida-odeme", acik: true },
        { kod: "havale", acik: true },
      ],
      kapidaOdemeSecenekleri: ["nakit"],
      havaleIptalSuresi: "3",
    });
    expect(
      (
        await hatasi(
          odeme.siparisVer(
            h.vt,
            {
              kim: misafir(),
              bilgiler: bilgiler({ yontem: "kapida-odeme", secenek: "kart" }),
              kalemler: [{ birim: a.birim, adet: 1 }],
            },
            oturumSuresi,
          ),
        )
      ).kod,
    ).toBe("is-kurali");
    // Banka hesabı yoksa havale yoktur.
    await yontemler.hesapSil(h.vt, yonetici(), hesapKimligi);
    expect((await hatasi(ver(h.vt, [{ birim: a.birim, adet: 1 }]))).kod).toBe("is-kurali");
    expect(await h.vt.select().from(siparisler)).toEqual([]);
    expect(await h.vt.select().from(odemeOturumlari)).toEqual([]);
    expect(await h.miktar(a.birim)).toBe(50);
  });

  it("aynı anda iki siparişte son ürün bir kez satılır", async () => {
    const h = await hazirla();
    const a = await h.urunAc({ miktar: 1 });
    const sonuclar = await Promise.allSettled([
      ver(h.vt, [{ birim: a.birim, adet: 1 }]),
      ver(h.vt, [{ birim: a.birim, adet: 1 }], { kim: misafir("ikinci@ornek.test") }),
    ]);
    expect(sonuclar.filter((sonuc) => sonuc.status === "fulfilled")).toHaveLength(1);
    const red = sonuclar.find((sonuc) => sonuc.status === "rejected");
    expect(red?.status === "rejected" && red.reason instanceof BilinenHata && red.reason.kod).toBe(
      "cakisma",
    );
    expect(await h.miktar(a.birim)).toBe(0);
    expect(await h.vt.select().from(siparisler)).toHaveLength(1);
  });

  it("açık duran siparişin arkasındaki sipariş stok satırının kilidinde bekler, son ürünü almaz", async () => {
    const h = await hazirla();
    const a = await h.urunAc({ miktar: 1 });
    // Birinci sipariş stok satırını kilitler (ayırma) ama işlem bitmez.
    let birak = () => {};
    const bekle = new Promise<void>((tamam) => {
      birak = tamam;
    });
    let kilitlendi = () => {};
    const kilitli = new Promise<void>((tamam) => {
      kilitlendi = tamam;
    });
    const birinci = h.vt.transaction(async (islem) => {
      await islem
        .select()
        .from(birimStoklari)
        .where(eq(birimStoklari.birim_kimligi, a.birim))
        .for("update");
      kilitlendi();
      await bekle;
      await islem
        .update(birimStoklari)
        .set({ miktar: 0 })
        .where(eq(birimStoklari.birim_kimligi, a.birim));
    });
    // İkinci sipariş ancak birinci stok satırını kilitledikten sonra başlar (kart 0230).
    await Promise.race([kilitli, birinci]);
    const ikinci = hatasi(ver(h.vt, [{ birim: a.birim, adet: 1 }]));
    await kilitBekleyeniGor(h.vt);
    birak();
    await birinci;
    expect((await ikinci).kod).toBe("cakisma");
    expect(await h.vt.select().from(siparisler)).toEqual([]);
  });

  it("başka ödemenin süresi dolmamış ayırması düşülmüş sayılır, süresi dolan sayılmaz", async () => {
    const h = await hazirla();
    const a = await h.urunAc({ miktar: 2 });
    // Kartla ödemenin yolu (kart 0215): yalnız oturum ve ayırma, iki adet.
    const ayiran = await odeme.odemeOturumuAc(
      h.vt,
      {
        kim: misafir("ayiran@ornek.test"),
        bilgiler: bilgiler(),
        kalemler: [{ birim: a.birim, adet: 2 }],
      },
      oturumSuresi,
    );
    expect((await hatasi(ver(h.vt, [{ birim: a.birim, adet: 1 }]))).kod).toBe("cakisma");
    expect(await h.miktar(a.birim)).toBe(2);
    // stokDus da ayırmayı sayar (ayırmayı atlayan çağıran bile son ürünü alamaz).
    expect(
      (
        await hatasi(
          h.vt.transaction((islem) =>
            stok.stokDus(islem, yonetici(), [{ birim: a.birim, adet: 1 }], { sebep: "siparis" }),
          ),
        )
      ).kod,
    ).toBe("cakisma");
    // Kendi oturumunun ayırması kendisine engel değildir.
    await h.vt.transaction((islem) =>
      stok.stokDus(islem, yonetici(), [{ birim: a.birim, adet: 2 }], {
        sebep: "siparis",
        oturum: ayiran.oturum,
      }),
    );
    expect(await h.miktar(a.birim)).toBe(0);
    await h.vt.transaction((islem) =>
      stok.stokArtir(islem, yonetici(), [{ birim: a.birim, adet: 2 }], { sebep: "siparis-iptali" }),
    );
    // Süresi dolan ayırma sayılmaz.
    await h.vt.execute(
      sql`update stok_ayirmalari set bitis_zamani = now() - interval '1 millisecond'`,
    );
    await ver(h.vt, [{ birim: a.birim, adet: 2 }]);
    expect(await h.miktar(a.birim)).toBe(0);
  });

  it("açık duran ayırmanın arkasında bekleyen düşürme kilit kalkınca ayırmayı görür (sıra kurularak)", async () => {
    const h = await hazirla();
    const a = await h.urunAc({ miktar: 1 });
    // Bir ödeme oturumu son ürünü ayırır ama işlemi bitmez; ayırma stok satırını kilitlemiştir.
    const oturum = await odeme.odemeOturumuAc(
      h.vt,
      {
        kim: misafir("bos@ornek.test"),
        bilgiler: bilgiler(),
        kalemler: [{ birim: a.birim, adet: 1 }],
      },
      oturumSuresi,
    );
    await h.vt.delete(stokAyirmalari);
    let birak = () => {};
    const bekle = new Promise<void>((tamam) => {
      birak = tamam;
    });
    let kilitlendi = () => {};
    const kilitli = new Promise<void>((tamam) => {
      kilitlendi = tamam;
    });
    const ayiran = h.vt.transaction(async (islem) => {
      await stok.stokAyir(islem, oturum.oturum, [{ birim: a.birim, adet: 1 }], oturum.bitis);
      kilitlendi();
      await bekle;
    });
    // Düşüren işlem ancak ayıran stok satırını kilitledikten sonra başlar; yoksa kilidi önce o
    // alıp ayırmasız stoğu düşürebilir (hat 44273517233, kart 0230). Ayıran düşerse hata buradan çıkar.
    await Promise.race([kilitli, ayiran]);
    // Başka bir oturumun siparişi aynı birimi düşürmek ister: stok satırının kilidinde bekler.
    const dusen = hatasi(
      h.vt.transaction((islem) =>
        stok.stokDus(islem, yonetici(), [{ birim: a.birim, adet: 1 }], {
          sebep: "siparis",
          oturum: randomUUID(),
        }),
      ),
    );
    await kilitBekleyeniGor(h.vt);
    birak();
    await ayiran;
    expect((await dusen).kod).toBe("cakisma");
    expect(await h.miktar(a.birim)).toBe(1);
  });

  it("numaralar aynı anda verilen siparişlerde tekrar etmez", async () => {
    const h = await hazirla();
    const a = await h.urunAc({ miktar: 100 });
    const sonuclar = await Promise.all(
      Array.from({ length: 8 }, (_, sira) =>
        ver(h.vt, [{ birim: a.birim, adet: 1 }], { kim: misafir(`m${sira}@ornek.test`) }),
      ),
    );
    const numaralar = sonuclar.map((sonuc) => sonuc.siparis.numara);
    expect(new Set(numaralar).size).toBe(8);
    const sayilar = numaralar
      .map((numara) => Number(numara.split("-")[1]))
      .toSorted((x, y) => x - y);
    expect(sayilar).toEqual(
      Array.from({ length: 8 }, (_, sira) => site.ayarlar.siparisBaslangici + sira),
    );
  });

  it("siparişe dönen oturum temizlikte ve müşterinin yeniden onayında silinmez", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    const ilk = await ver(h.vt, [{ birim: a.birim, adet: 1 }]);
    await h.vt.execute(
      sql`update odeme_oturumlari set olusturma_zamani = now() - interval '3 days', bitis_zamani = now() - interval '2 days'`,
    );
    expect(await eskiOdemeOturumlariniSil(h.vt)).toBe(0);
    // Aynı sekme ikinci siparişi önceki oturumla gönderir: önceki oturum siparişe bağlı kalır.
    await ver(h.vt, [{ birim: a.birim, adet: 1 }], { onceki: ilk.oturum });
    expect(await h.vt.select().from(odemeOturumlari)).toHaveLength(2);
    expect(await h.vt.select().from(siparisler)).toHaveLength(2);
  });

  it("aynı oturumdan ikinci sipariş kurulmaz", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    const ilk = await ver(h.vt, [{ birim: a.birim, adet: 1 }]);
    const [oturum] = await h.vt
      .select()
      .from(odemeOturumlari)
      .where(eq(odemeOturumlari.kimlik, ilk.oturum));
    if (oturum === undefined) throw new Error("Oturum yok.");
    const sonuc = await hatasi(
      h.vt.transaction(async (islem) =>
        siparis.siparisiKur(islem, {
          oturum: { ...oturum, musteri: null },
          hesap: await sepetiHesapla(h.vt, site, [{ birim: a.birim, adet: 1 }]),
          odeme: { yontem: "havale" },
          havaleIptalSuresi: 3,
        }),
      ),
    );
    expect(sonuc).toEqual({ kod: "cakisma", ayrinti: [{ alan: "oturum", kod: "siparis-var" }] });
    expect(await h.vt.select().from(siparisler)).toHaveLength(1);
    expect(await h.miktar(a.birim)).toBe(49);
  });
});

describe("havalenin iptali", () => {
  it("süresi dolan havale bir kez iptal olur, stok siparişin düşürdüğü kadar döner; süresinden önce iptal olmaz", async () => {
    const h = await hazirla();
    const a = await h.urunAc({ miktar: 10 });
    const b = await h.urunAc({ miktar: 10 });
    await ver(h.vt, [
      { birim: a.birim, adet: 3 },
      { birim: b.birim, adet: 1 },
    ]);
    // Kapıda ödeme siparişi hiç iptal olmaz.
    await odeme.siparisVer(
      h.vt,
      {
        kim: misafir(),
        bilgiler: bilgiler({ yontem: "kapida-odeme", secenek: "nakit" }),
        kalemler: [{ birim: a.birim, adet: 1 }],
      },
      oturumSuresi,
    );
    expect(await h.miktar(a.birim)).toBe(6);
    // Süresinden bir saniye önce: iptal olmaz.
    await h.vt.execute(
      sql`update siparisler set odeme_son_zamani = now() + interval '1 second' where odeme_yontemi = 'havale'`,
    );
    expect(await siparis.havaleIptalTaramasi(h.vt)).toBe(0);
    // Süresi doldu; arada stok elle değişti: yalnız siparişin düşürdüğü kadar geri konur.
    await h.vt.execute(
      sql`update siparisler set odeme_son_zamani = now() - interval '1 millisecond' where odeme_yontemi = 'havale'`,
    );
    await stok.stokDuzelt(h.vt, yonetici(), a.birim, {
      yeniMiktar: 20,
      gorulenMiktar: 6,
      sebep: "sayim",
    });
    const [ilk, ikinci] = await Promise.all([
      siparis.havaleIptalTaramasi(h.vt),
      siparis.havaleIptalTaramasi(h.vt),
    ]);
    expect((ilk ?? 0) + (ikinci ?? 0)).toBe(1);
    expect(await siparis.havaleIptalTaramasi(h.vt)).toBe(0);
    expect(await h.miktar(a.birim)).toBe(23);
    expect(await h.miktar(b.birim)).toBe(10);
    const durumlar = await h.vt
      .select({ yontem: siparisler.odeme_yontemi, durum: siparisler.durum })
      .from(siparisler)
      .orderBy(siparisler.odeme_yontemi);
    expect(durumlar).toEqual([
      { yontem: "havale", durum: "iptal" },
      { yontem: "kapida-odeme", durum: "odeme-bekleniyor" },
    ]);
    const iptal = await h.vt
      .select()
      .from(siparisGecmisi)
      .where(eq(siparisGecmisi.neden, "havale-suresi-doldu"));
    expect(iptal).toMatchObject([
      { onceki_durum: "odeme-bekleniyor", sonraki_durum: "iptal", kim_turu: "sistem" },
    ]);
    const geri = await h.vt
      .select()
      .from(stokGecmisi)
      .where(eq(stokGecmisi.sebep, "siparis-iptali"));
    expect(geri).toHaveLength(2);
  });

  it("bir siparişin iptali hata verirse hata kaydedilir, tarama sonraki siparişlerle sürer", async () => {
    const h = await hazirla();
    const a = await h.urunAc({ miktar: 10 });
    const b = await h.urunAc({ miktar: 10 });
    await ver(h.vt, [{ birim: a.birim, adet: 1 }]);
    await ver(h.vt, [{ birim: b.birim, adet: 1 }], { kim: misafir("ikinci@ornek.test") });
    // İlk siparişin (süresi daha önce dolan) birimi üst sınırda: stok geri konamaz, iptal hata verir.
    await h.vt.execute(
      sql`update siparisler set odeme_son_zamani = now() - interval '2 hours' where eposta = 'misafir@ornek.test'`,
    );
    await h.vt.execute(
      sql`update siparisler set odeme_son_zamani = now() - interval '1 hour' where eposta = 'ikinci@ornek.test'`,
    );
    await stok.stokDuzelt(h.vt, yonetici(), a.birim, {
      yeniMiktar: 1_000_000_000,
      gorulenMiktar: 9,
      sebep: "sayim",
    });
    expect(await siparis.havaleIptalTaramasi(h.vt)).toBe(1);
    const durumlar = await h.vt
      .select({ eposta: siparisler.eposta, durum: siparisler.durum })
      .from(siparisler)
      .orderBy(siparisler.eposta);
    expect(durumlar).toEqual([
      { eposta: "ikinci@ornek.test", durum: "iptal" },
      { eposta: "misafir@ornek.test", durum: "odeme-bekleniyor" },
    ]);
    expect(await h.miktar(b.birim)).toBe(10);
  });

  it("ödediğini bildiren müşterinin siparişi süre dolunca iptal olmaz", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    const sonuc = await ver(h.vt, [{ birim: a.birim, adet: 1 }]);
    await siparis.havaleBildir(
      h.vt,
      { tur: "eposta", eposta: "MISAFIR@ornek.test" },
      bildirim(sonuc.siparis.numara),
    );
    await h.vt.execute(sql`update siparisler set odeme_son_zamani = now() - interval '1 day'`);
    expect(await siparis.havaleIptalTaramasi(h.vt)).toBe(0);
    const [kayit] = await h.vt.select().from(siparisler);
    expect(kayit?.durum).toBe("odeme-bekleniyor");
  });
});

describe("havale bildirimi", () => {
  it("numara ve e-posta eşleşince yazılır; eşleşmeyen, başka üyenin ve kapıda ödemeli sipariş yazılmaz", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    const uye = await h.musteriAc();
    const misafirin = await ver(h.vt, [{ birim: a.birim, adet: 1 }]);
    const uyenin = await odeme.siparisVer(
      h.vt,
      {
        kim: { tur: "uye", musteri: uye },
        bilgiler: bilgiler(),
        kalemler: [{ birim: a.birim, adet: 1 }],
      },
      oturumSuresi,
    );
    const kapida = await odeme.siparisVer(
      h.vt,
      {
        kim: misafir(),
        bilgiler: bilgiler({ yontem: "kapida-odeme", secenek: "nakit" }),
        kalemler: [{ birim: a.birim, adet: 1 }],
      },
      oturumSuresi,
    );
    const yanlisEposta = await hatasi(
      siparis.havaleBildir(
        h.vt,
        { tur: "eposta", eposta: "baska@ornek.test" },
        bildirim(misafirin.siparis.numara),
      ),
    );
    const olmayan = await hatasi(
      siparis.havaleBildir(
        h.vt,
        { tur: "eposta", eposta: "misafir@ornek.test" },
        bildirim("DEN-9999"),
      ),
    );
    // İki hata aynıdır: siparişin var olup olmadığı belli olmaz.
    expect(yanlisEposta).toEqual({ kod: "bulunamadi", ayrinti: undefined });
    expect(olmayan).toEqual(yanlisEposta);
    expect(
      (
        await hatasi(
          siparis.havaleBildir(
            h.vt,
            { tur: "musteri", musteri: await h.musteriAc() },
            bildirim(uyenin.siparis.numara),
          ),
        )
      ).kod,
    ).toBe("bulunamadi");
    expect(
      (
        await hatasi(
          siparis.havaleBildir(
            h.vt,
            { tur: "eposta", eposta: "misafir@ornek.test" },
            bildirim(kapida.siparis.numara),
          ),
        )
      ).ayrinti,
    ).toEqual([{ alan: "numara", kod: "havale-beklemiyor" }]);
    expect(await h.vt.select().from(havaleBildirimleri)).toEqual([]);

    await siparis.havaleBildir(
      h.vt,
      { tur: "musteri", musteri: uye },
      bildirim(uyenin.siparis.numara.toLowerCase(), {
        tutar: "1.399,60",
        not: "Açıklamaya numara yazdım.",
      }),
    );
    const [yazilan] = await h.vt.select().from(havaleBildirimleri);
    expect(yazilan).toMatchObject({
      tutar: 139_960,
      banka: "Deneme Bankası",
      iban: "TR420001000000000000000001",
      not: "Açıklamaya numara yazdım.",
    });
    const gecmis = await h.vt
      .select()
      .from(siparisGecmisi)
      .where(eq(siparisGecmisi.neden, "havale-bildirildi"));
    expect(gecmis).toMatchObject([
      {
        onceki_durum: "odeme-bekleniyor",
        sonraki_durum: "odeme-bekleniyor",
        kim_turu: "musteri",
        kim_kimligi: uye,
      },
    ]);
  });

  it("tutar, ödeme günü ve hesap denetlenir", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    const sonuc = await ver(h.vt, [{ birim: a.birim, adet: 1 }]);
    const sahip = { tur: "eposta", eposta: "misafir@ornek.test" } as const;
    const hata = await hatasi(
      siparis.havaleBildir(
        h.vt,
        sahip,
        bildirim(sonuc.siparis.numara, {
          tutar: "bir milyon",
          odemeTarihi: "2026-02-30",
          hesap: randomUUID(),
        }),
      ),
    );
    expect(hata).toEqual({
      kod: "dogrulama",
      ayrinti: [
        { alan: "tutar", kod: "tutar-okunamadi" },
        { alan: "odemeTarihi", kod: "tarih-gecersiz" },
        { alan: "hesap", kod: "hesap-yok" },
      ],
    });
    // Gelecekteki gün (yarından sonra) geçmez, sıfır tutar geçmez.
    const ileri = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    expect(
      (
        await hatasi(
          siparis.havaleBildir(
            h.vt,
            sahip,
            bildirim(sonuc.siparis.numara, { odemeTarihi: ileri, tutar: "0" }),
          ),
        )
      ).ayrinti,
    ).toEqual([
      { alan: "tutar", kod: "tutar-okunamadi" },
      { alan: "odemeTarihi", kod: "tarih-gecersiz" },
    ]);
    expect(await h.vt.select().from(havaleBildirimleri)).toEqual([]);
    // Siparişten önceki gün geçmez.
    expect(
      (
        await hatasi(
          siparis.havaleBildir(
            h.vt,
            sahip,
            bildirim(sonuc.siparis.numara, { odemeTarihi: "2020-01-01" }),
          ),
        )
      ).ayrinti,
    ).toEqual([{ alan: "odemeTarihi", kod: "tarih-gecersiz" }]);
  });

  it("bir siparişe en çok beş bildirim yazılır", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    const sonuc = await ver(h.vt, [{ birim: a.birim, adet: 1 }]);
    const sahip = { tur: "eposta", eposta: "misafir@ornek.test" } as const;
    for (let sira = 0; sira < 5; sira++) {
      await siparis.havaleBildir(h.vt, sahip, bildirim(sonuc.siparis.numara));
    }
    expect(await hatasi(siparis.havaleBildir(h.vt, sahip, bildirim(sonuc.siparis.numara)))).toEqual(
      {
        kod: "is-kurali",
        ayrinti: [{ alan: "numara", kod: "bildirim-siniri" }],
      },
    );
    expect(await h.vt.select().from(havaleBildirimleri)).toHaveLength(5);
  });
});

describe("erişim ve ayrım", () => {
  it("sipariş yalnız erişim anahtarıyla okunur; iki site birbirinin siparişini görmez", async () => {
    const a = await hazirla();
    const b = await hazirla();
    const birimA = await a.urunAc();
    const birimB = await b.urunAc();
    const sonucA = await ver(a.vt, [{ birim: birimA.birim, adet: 1 }]);
    const sonucB = await ver(b.vt, [{ birim: birimB.birim, adet: 1 }]);
    // Her sitenin numarası kendi sırasından.
    expect(sonucA.siparis.numara).toBe(sonucB.siparis.numara);
    const okunan = await siparis.erisimleOku(a.vt, sonucA.siparis.erisimAnahtari);
    expect(okunan?.siparis.numara).toBe(sonucA.siparis.numara);
    expect(okunan?.kalemler).toHaveLength(1);
    expect(await siparis.erisimleOku(b.vt, sonucA.siparis.erisimAnahtari)).toBeNull();
    expect(await siparis.erisimleOku(a.vt, sonucB.siparis.erisimAnahtari)).toBeNull();
    expect(await siparis.erisimleOku(a.vt, undefined)).toBeNull();
    expect(await siparis.erisimleOku(a.vt, "kisa")).toBeNull();
    expect(
      await siparis.erisimleOku(a.vt, `${sonucA.siparis.erisimAnahtari.slice(0, -1)}x`),
    ).toBeNull();
    // A'nın müşterisi B'nin siparişine bildirim yazamaz.
    expect(
      (
        await hatasi(
          siparis.havaleBildir(
            a.vt,
            { tur: "eposta", eposta: "misafir@ornek.test" },
            bildirim("DEN-1002"),
          ),
        )
      ).kod,
    ).toBe("bulunamadi");
  });
});

describe("veritabanı", () => {
  it("geçmiş değiştirilemez; durum, neden ve yöntem denetimleri kayıtla aynıdır", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    await ver(h.vt, [{ birim: a.birim, adet: 1 }]);
    await expect(
      h.vt.execute(sql`update siparis_gecmisi set neden = 'olusturuldu'`),
    ).rejects.toThrow();
    await expect(h.vt.execute(sql`delete from siparis_gecmisi`)).rejects.toThrow();
    await expect(h.vt.execute(sql`truncate siparis_gecmisi`)).rejects.toThrow();
    const kosul = async (ad: string) =>
      (
        await h.vt.execute<{ tanim: string }>(
          sql`select pg_get_constraintdef(oid) as tanim from pg_constraint where conname = ${ad}`,
        )
      ).rows[0]?.tanim ?? "";
    const tirnakli = (liste: readonly string[]) => liste.map((ad) => `'${ad}'`);
    for (const ad of tirnakli(siparisDurumlari))
      expect(await kosul("siparisler_durum")).toContain(ad);
    expect((await kosul("siparisler_durum")).match(/'[a-z-]+'/g)).toHaveLength(
      siparisDurumlari.length,
    );
    expect((await kosul("siparis_gecmisi_neden")).match(/'[a-z-]+'/g)?.toSorted()).toEqual(
      tirnakli(siparisGecmisiNedenleri).toSorted(),
    );
    const yontem = await kosul("siparisler_odeme_yontemi");
    for (const ad of [...tirnakli(odemeYontemleri), ...tirnakli(kapidaOdemeSecenekleri)]) {
      expect(yontem).toContain(ad);
    }
    // Havale son ansız, kapıda ödeme seçeneksiz yazılamaz.
    await expect(
      h.vt.execute(
        sql`update siparisler set odeme_son_zamani = null where odeme_yontemi = 'havale'`,
      ),
    ).rejects.toThrow();
  });
});
