// Panelden elle sipariş gerçek veritabanıyla (kart 0236, karar 0148):
// - Aynı kalemler ve adresle vitrin siparişiyle aynı tutar, kargo, vergi ve kalem değerleri.
// - Stok aynı işlemde düşer, oturumun ayırması siparişe geçer; başka bir ödemenin süresi dolmamış ayırması sayılır; son
//   ürün aynı anda iki elle siparişte bir kez satılır (sıra kurularak).
// - Görülen toplam sunucunun toplamından farklıysa sipariş kurulmaz; şema tutar alanını kabul etmez.
// - Havale ve kapıda ödeme "ödeme bekleniyor", "elden" "hazırlanıyor" ve ödeme anıyla açılır.
// - Geçmişte "panelden-olusturuldu" ve siparişi giren yönetici; değişiklik kaydı; onaylar yöneticinin beyanı, pazarlama
//   izni yok.
// - Üye olmadan alışveriş kapalıyken de üye olmayan müşteri girilir; üyenin e-postası hesabından, silinmiş hesap
//   oturum-yok. Ürün araması yalnız vitrinde sayfası açılan ürünleri, müşteri araması silinmemiş hesapları ve son
//   teslimatı verir. İki site ayrı.
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { and, eq, sql } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type Site, siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import { baglantiyiKapat, type Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { kilitBekleyeniGor } from "../../../veritabani/testler/kilit-bekleyen.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { siteninFiyatServisi } from "../../fiyat/servis.ts";
import { siteninServisi } from "../../magaza-ayarlari/servis.ts";
import { musteriler } from "../../musteri/model.ts";
import { odemeOturumlari } from "../../odeme/model.ts";
import { type OdemeYontemiSecimi, odemeBilgileriSemasi } from "../../odeme/semalar.ts";
import { odemeServisi } from "../../odeme/servis.ts";
import { hesapAc } from "../../oturum/servis.ts";
import { birimStoklari, stokAyirmalari } from "../../stok/model.ts";
import { stokServisi } from "../../stok/servis.ts";
import { urunServisi } from "../../urun/servis.ts";
import { siteninVergiServisi } from "../../vergi/servis.ts";
import { elleSiparisMusterileri, elleSiparisUrunleri } from "../elle.ts";
import { siparisGecmisi, siparisKalemleri, siparisler } from "../model.ts";
import { type ElleSiparisGirdisi, elleSiparisSemasi } from "../semalar.ts";

vi.setConfig({ testTimeout: 90_000 });

const klasor = siteKlasorunuOku(
  resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler/vergi-dolu"),
);
const firmaKimligi = randomUUID();
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
    kapidaOdemeSecenekleri: ["nakit"],
    bankaHesaplari: [
      {
        kimlik: randomUUID(),
        banka: "Deneme Bankası",
        sahip: "Deneme Ticaret",
        iban: "TR420001000000000000000001",
      },
    ],
    kargoFirmalari: [{ kimlik: firmaKimligi, ad: "Deneme Kargo" }],
  },
};
const urunSrv = urunServisi(() => site.ayarlar.saatDilimi);
const yapan = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

const temizlenecekler: (() => Promise<void>)[] = [];
afterEach(async () => {
  await baglantiyiKapat();
  for (const temizle of temizlenecekler.splice(0)) await temizle();
});

const hazirla = async (ad = "elle-siparis") => {
  const deneme = await denemeSitesiAc(ad);
  temizlenecekler.push(deneme.sil);
  const vt = deneme.vt;
  const genel = (await siteninVergiServisi(site).tabloyuOku(vt)).find(
    (s) => s.ad === "Genel",
  )?.kimlik;
  if (genel === undefined) throw new Error("Genel sınıf yok.");
  const urunAc = async ({
    takip = true,
    fiyat = 10_000,
    miktar = 50,
    durum = "yayinda",
  }: {
    takip?: boolean;
    fiyat?: number;
    miktar?: number;
    durum?: "yayinda" | "taslak";
  } = {}) => {
    const urun = await urunSrv.urunEkle(vt, yapan(), {
      ad: `Ürün ${randomUUID().slice(0, 8)}`,
      vergiSinifi: genel,
      durum,
      stokTakibi: takip,
    });
    const birim = (await urunSrv.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
    await siteninFiyatServisi(site).fiyatYaz(vt, yapan(), birim, { satisFiyati: fiyat });
    if (takip) {
      await stokServisi().stokDuzelt(vt, yapan(), birim, {
        yeniMiktar: miktar,
        gorulenMiktar: 0,
        sebep: "sayim",
      });
    }
    return birim;
  };
  return { vt, urunAc };
};

const havale: OdemeYontemiSecimi = { yontem: "havale" };
const kapida: OdemeYontemiSecimi = { yontem: "kapida-odeme", secenek: "nakit" };

const ver = async (
  vt: Veritabani,
  kalemler: { birim: string; adet: number }[],
  yontem: OdemeYontemiSecimi = kapida,
) =>
  (
    await odemeServisi(site).siparisVer(
      vt,
      {
        kim: { tur: "misafir", eposta: "misafir@ornek.test", hesap: { ac: false } },
        bilgiler: odemeBilgileriSemasi.parse({
          odemeYontemi: yontem,
          teslimat: {
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
          },
          fatura: { tur: "bireysel", adresAyni: true },
          onBilgilendirmeOnayi: true,
          mesafeliSatisOnayi: true,
          pazarlamaIzni: false,
        }),
        kalemler,
      },
      3600,
    )
  ).siparis.numara;

const odeme = odemeServisi(site);

const teslimatBilgisi = {
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

const elle = (
  kalemler: { birim: string; adet: number }[],
  ek: {
    yontem?: ElleSiparisGirdisi["bilgiler"]["odemeYontemi"];
    musteri?: ElleSiparisGirdisi["musteri"];
    gorulenToplam?: number;
  } = {},
): ElleSiparisGirdisi =>
  elleSiparisSemasi.parse({
    musteri: ek.musteri ?? { tur: "misafir", eposta: "telefon@ornek.test" },
    kalemler,
    bilgiler: {
      odemeYontemi: ek.yontem ?? { yontem: "havale" },
      teslimat: teslimatBilgisi,
      fatura: { tur: "bireysel", adresAyni: true },
      not: "Telefonla verildi",
      metinlerIletildi: true,
    },
    ...(ek.gorulenToplam === undefined ? {} : { gorulenToplam: ek.gorulenToplam }),
  });

const oku = async (vt: Veritabani, numara: string) => {
  const [satir] = await vt.select().from(siparisler).where(eq(siparisler.numara, numara));
  if (satir === undefined) throw new Error("Sipariş yok.");
  return satir;
};
const kalemleri = (vt: Veritabani, siparis: string) =>
  vt
    .select()
    .from(siparisKalemleri)
    .where(eq(siparisKalemleri.siparis_kimligi, siparis))
    .orderBy(siparisKalemleri.sira);
const stogu = async (vt: Veritabani, birim: string) =>
  (await vt.select().from(birimStoklari).where(eq(birimStoklari.birim_kimligi, birim)))[0]?.miktar;

const hatasi = async (is: Promise<unknown>) => {
  try {
    await is;
  } catch (hata) {
    if (hata instanceof BilinenHata) return { kod: hata.kod, ayrinti: hata.ayrinti };
    throw hata;
  }
  throw new Error("Hata bekleniyordu.");
};

describe("elle sipariş", () => {
  it("vitrin siparişiyle aynı tutar, kargo, vergi ve kalemler; stok düşer, ayırma kalmaz", async () => {
    const h = await hazirla();
    const a = await h.urunAc({ fiyat: 12_345 });
    const b = await h.urunAc({ fiyat: 999 });
    const kalemler = [
      { birim: a, adet: 2 },
      { birim: b, adet: 3 },
    ];
    const vitrin = await oku(h.vt, await ver(h.vt, kalemler, havale));
    const { numara } = await odeme.elleSiparisVer(h.vt, randomUUID(), elle(kalemler));
    const panel = await oku(h.vt, numara);
    for (const alan of [
      "ara_toplam",
      "kargo_turu",
      "kargo_tutari",
      "vergi_toplami",
      "toplam",
      "vergi_dokumu",
      "gosterim",
      "para_birimi",
      "durum",
    ] as const) {
      expect(panel[alan], alan).toEqual(vitrin[alan]);
    }
    const sade = (satirlar: Awaited<ReturnType<typeof kalemleri>>) =>
      satirlar.map(
        ({ birim_kimligi, adet, birim_tutari, tutar, vergisiz, vergi, vergi_oranlari }) => ({
          birim_kimligi,
          adet,
          birim_tutari,
          tutar,
          vergisiz,
          vergi,
          vergi_oranlari,
        }),
      );
    expect(sade(await kalemleri(h.vt, panel.kimlik))).toEqual(
      sade(await kalemleri(h.vt, vitrin.kimlik)),
    );
    expect(await stogu(h.vt, a)).toBe(46);
    expect(await stogu(h.vt, b)).toBe(44);
    expect(
      await h.vt
        .select()
        .from(stokAyirmalari)
        .where(eq(stokAyirmalari.oturum_kimligi, panel.oturum_kimligi ?? "")),
    ).toEqual([]);
  });

  it("havale ve kapıda ödeme ödeme bekleniyor, elden hazırlanıyor ve ödeme anıyla açılır", async () => {
    const h = await hazirla();
    const birim = await h.urunAc();
    const havaleli = await oku(
      h.vt,
      (await odeme.elleSiparisVer(h.vt, randomUUID(), elle([{ birim, adet: 1 }]))).numara,
    );
    expect(havaleli).toMatchObject({
      durum: "odeme-bekleniyor",
      odeme_yontemi: "havale",
      odeme_zamani: null,
    });
    expect(havaleli.odeme_son_zamani).not.toBeNull();
    const kapidaSiparis = await oku(
      h.vt,
      (
        await odeme.elleSiparisVer(
          h.vt,
          randomUUID(),
          elle([{ birim, adet: 1 }], { yontem: { yontem: "kapida-odeme", secenek: "nakit" } }),
        )
      ).numara,
    );
    expect(kapidaSiparis).toMatchObject({
      durum: "odeme-bekleniyor",
      kapida_secenegi: "nakit",
      odeme_zamani: null,
    });
    const elden = await oku(
      h.vt,
      (
        await odeme.elleSiparisVer(
          h.vt,
          randomUUID(),
          elle([{ birim, adet: 1 }], { yontem: { yontem: "elden" } }),
        )
      ).numara,
    );
    expect(elden).toMatchObject({
      durum: "hazirlaniyor",
      odeme_yontemi: "elden",
      odeme_son_zamani: null,
      tahsilat: null,
    });
    expect(elden.odeme_zamani).not.toBeNull();
  });

  it("vitrinde elden yöntemi yoktur: ödeme adımı elden ile sipariş kurmaz", async () => {
    const h = await hazirla();
    const birim = await h.urunAc();
    expect(
      odemeBilgileriSemasi.safeParse({
        odemeYontemi: { yontem: "elden" },
        teslimat: teslimatBilgisi,
        fatura: { tur: "bireysel", adresAyni: true },
        onBilgilendirmeOnayi: true,
        mesafeliSatisOnayi: true,
        pazarlamaIzni: false,
      }).success,
    ).toBe(false);
    await expect(
      h.vt.insert(siparisler).values({
        ...(await oku(h.vt, await ver(h.vt, [{ birim, adet: 1 }], havale))),
        kimlik: randomUUID(),
        numara: `X-${randomUUID().slice(0, 6)}`,
        oturum_kimligi: null,
        odeme_yontemi: "elden",
        odeme_son_zamani: null,
        odeme_zamani: null,
      }),
    ).rejects.toThrow();
  });

  it("geçmişe panelden nedeni ve siparişi giren yönetici, değişiklik kaydı; onaylar yöneticinin beyanı", async () => {
    const h = await hazirla();
    const birim = await h.urunAc();
    const yonetici = randomUUID();
    const { numara } = await odeme.elleSiparisVer(h.vt, yonetici, elle([{ birim, adet: 1 }]));
    const siparis = await oku(h.vt, numara);
    expect(
      await h.vt
        .select()
        .from(siparisGecmisi)
        .where(eq(siparisGecmisi.siparis_kimligi, siparis.kimlik)),
    ).toMatchObject([
      {
        onceki_durum: null,
        sonraki_durum: "odeme-bekleniyor",
        neden: "panelden-olusturuldu",
        kim_turu: "yonetici",
        kim_kimligi: yonetici,
      },
    ]);
    const [kayit] = await h.vt
      .select()
      .from(degisiklikKayitlari)
      .where(
        and(
          eq(degisiklikKayitlari.islem, "siparis.panelden-olusturuldu"),
          eq(degisiklikKayitlari.kayit_kimligi, siparis.kimlik),
        ),
      );
    expect(kayit).toMatchObject({
      kim_kimligi: yonetici,
      yeni_deger: {
        numara,
        toplam: siparis.toplam,
        odemeYontemi: "havale",
        metinlerIletildi: true,
      },
    });
    expect(siparis.onaylar).toEqual([
      expect.objectContaining({ tur: "on-bilgilendirme", verildi: true, beyan: yonetici }),
      expect.objectContaining({ tur: "mesafeli-satis", verildi: true, beyan: yonetici }),
      expect.objectContaining({ tur: "pazarlama", verildi: false }),
    ]);
    // Vitrin siparişinin onayında beyan yoktur (müşterinin kendi onayı).
    const vitrin = await oku(h.vt, await ver(h.vt, [{ birim, adet: 1 }], havale));
    expect(vitrin.onaylar.every((onay) => onay.beyan === undefined)).toBe(true);
  });

  it("görülen toplam farklıysa kurulmaz; şema tutar alanını ve iletilmemiş metinleri kabul etmez", async () => {
    const h = await hazirla();
    const birim = await h.urunAc();
    const once = await stogu(h.vt, birim);
    expect(
      await hatasi(
        odeme.elleSiparisVer(h.vt, randomUUID(), elle([{ birim, adet: 1 }], { gorulenToplam: 1 })),
      ),
    ).toMatchObject({ kod: "is-kurali", ayrinti: [{ kod: "sepet-degisti" }] });
    expect(await stogu(h.vt, birim)).toBe(once);
    const taban = {
      musteri: { tur: "misafir", eposta: "a@ornek.test" },
      kalemler: [{ birim, adet: 1 }],
      bilgiler: {
        odemeYontemi: { yontem: "havale" },
        teslimat: teslimatBilgisi,
        fatura: { tur: "bireysel", adresAyni: true },
        metinlerIletildi: true,
      },
    };
    expect(elleSiparisSemasi.safeParse(taban).success).toBe(true);
    expect(elleSiparisSemasi.safeParse({ ...taban, toplam: 1 }).success).toBe(false);
    expect(
      elleSiparisSemasi.safeParse({ ...taban, kalemler: [{ birim, adet: 1, tutar: 1 }] }).success,
    ).toBe(false);
    expect(
      elleSiparisSemasi.safeParse({
        ...taban,
        bilgiler: { ...taban.bilgiler, metinlerIletildi: false },
      }).success,
    ).toBe(false);
    expect(
      elleSiparisSemasi.safeParse({
        ...taban,
        bilgiler: { ...taban.bilgiler, odemeYontemi: { yontem: "kart" } },
      }).success,
    ).toBe(false);
  });

  it("başka ödemenin süresi dolmamış ayırması sayılır", async () => {
    const h = await hazirla();
    const birim = await h.urunAc({ miktar: 1 });
    await odeme.odemeOturumuAc(
      h.vt,
      {
        kim: { tur: "misafir", eposta: "ayiran@ornek.test", hesap: { ac: false } },
        bilgiler: odemeBilgileriSemasi.parse({
          odemeYontemi: havale,
          teslimat: teslimatBilgisi,
          fatura: { tur: "bireysel", adresAyni: true },
          onBilgilendirmeOnayi: true,
          mesafeliSatisOnayi: true,
          pazarlamaIzni: false,
        }),
        kalemler: [{ birim, adet: 1 }],
      },
      3600,
    );
    expect(
      await hatasi(odeme.elleSiparisVer(h.vt, randomUUID(), elle([{ birim, adet: 1 }]))),
    ).toMatchObject({
      kod: "cakisma",
      ayrinti: [{ kod: "stok-ayrildi" }],
    });
    expect(await stogu(h.vt, birim)).toBe(1);
  });

  it("son ürün aynı anda iki elle siparişte bir kez satılır (sıra kurularak)", async () => {
    const h = await hazirla();
    const birim = await h.urunAc({ miktar: 1 });
    let birak = () => {};
    const bekle = new Promise<void>((tamam) => {
      birak = tamam;
    });
    let kilitlendi = () => {};
    const kilitli = new Promise<void>((tamam) => {
      kilitlendi = tamam;
    });
    const tutan = h.vt.transaction(async (islem) => {
      await islem
        .select()
        .from(birimStoklari)
        .where(eq(birimStoklari.birim_kimligi, birim))
        .for("update");
      kilitlendi();
      await bekle;
    });
    await Promise.race([kilitli, tutan]);
    const sonuc = (is: Promise<unknown>) =>
      is.then(
        (deger) => deger,
        (hata: unknown) => hata,
      );
    const birinci = sonuc(odeme.elleSiparisVer(h.vt, randomUUID(), elle([{ birim, adet: 1 }])));
    await kilitBekleyeniGor(h.vt);
    const ikinci = sonuc(odeme.elleSiparisVer(h.vt, randomUUID(), elle([{ birim, adet: 1 }])));
    await kilitBekleyeniGor(h.vt, 2);
    birak();
    await tutan;
    const sonuclar = await Promise.all([birinci, ikinci]);
    expect(sonuclar.filter((deger) => deger instanceof BilinenHata)).toHaveLength(1);
    expect(sonuclar.filter((deger) => !(deger instanceof BilinenHata))).toHaveLength(1);
    expect(await stogu(h.vt, birim)).toBe(0);
    expect(
      (await h.vt.execute<{ n: number }>(sql`select count(*)::int as n from siparisler`)).rows[0]
        ?.n,
    ).toBe(1);
  });

  it("üye olmadan alışveriş kapalıyken de üye olmayan müşteri girilir; üyenin e-postası hesabından, silinmiş hesap reddedilir", async () => {
    const h = await hazirla();
    await siteninServisi(site).degistir(h.vt, yapan(), { uyeOlmadanAlisveris: false });
    const birim = await h.urunAc();
    // Vitrinde üye olmayan reddedilir.
    expect(await hatasi(ver(h.vt, [{ birim, adet: 1 }], havale))).toMatchObject({
      kod: "oturum-yok",
    });
    const misafir = await odeme.elleSiparisVer(h.vt, randomUUID(), elle([{ birim, adet: 1 }]));
    expect((await oku(h.vt, misafir.numara)).eposta).toBe("telefon@ornek.test");
    const { hesapKimligi } = await hesapAc(h.vt, "musteri", {
      eposta: "uye-elle@ornek.test",
      sifre: "uzun-bir-sifre-123",
    });
    const uye = await odeme.elleSiparisVer(
      h.vt,
      randomUUID(),
      elle([{ birim, adet: 1 }], { musteri: { tur: "uye", kimlik: hesapKimligi } }),
    );
    expect(await oku(h.vt, uye.numara)).toMatchObject({
      musteri_kimligi: hesapKimligi,
      eposta: "uye-elle@ornek.test",
    });
    await h.vt
      .update(musteriler)
      .set({ silinme_zamani: sql`now()` })
      .where(eq(musteriler.kimlik, hesapKimligi));
    expect(
      await hatasi(
        odeme.elleSiparisVer(
          h.vt,
          randomUUID(),
          elle([{ birim, adet: 1 }], { musteri: { tur: "uye", kimlik: hesapKimligi } }),
        ),
      ),
    ).toMatchObject({ kod: "oturum-yok" });
  });

  it("ürün araması yalnız vitrinde sayfası açılan ürünleri, satılamayanı işaretli verir", async () => {
    const h = await hazirla();
    const ek = randomUUID().slice(0, 6);
    const yayinda = await h.urunAc();
    const tukenmis = await h.urunAc({ miktar: 0 });
    const taslak = await h.urunAc({ durum: "taslak" });
    const ad = async (birim: string) =>
      (
        await urunSrv.urunuOku(
          h.vt,
          (
            await h.vt.execute<{ urun: string }>(
              sql`select urun_kimligi as urun from urun_birimleri where kimlik = ${birim}`,
            )
          ).rows[0]?.urun ?? "",
        )
      )?.ad ?? "";
    const birimler = await elleSiparisUrunleri(h.vt, site, "Ürün");
    const kimlikler = birimler.map((birim) => birim.birim);
    expect(kimlikler).toContain(yayinda);
    expect(kimlikler).toContain(tukenmis);
    expect(kimlikler).not.toContain(taslak);
    expect(birimler.find((birim) => birim.birim === yayinda)).toMatchObject({
      satilabilir: true,
      ad: await ad(yayinda),
    });
    expect(birimler.find((birim) => birim.birim === yayinda)?.yaziliFiyat).not.toBeNull();
    expect(birimler.find((birim) => birim.birim === tukenmis)).toMatchObject({
      satilabilir: false,
    });
    expect(await elleSiparisUrunleri(h.vt, site, `yok-${ek}`)).toEqual([]);
  });

  it("müşteri araması silinmemiş hesapları ve son teslimatı (kişisel bilgisi silinmemiş) verir", async () => {
    const h = await hazirla();
    const birim = await h.urunAc();
    const ek = randomUUID().slice(0, 6);
    const { hesapKimligi } = await hesapAc(h.vt, "musteri", {
      eposta: `Bulunan-${ek}@Ornek.test`,
      sifre: "uzun-bir-sifre-123",
    });
    const { hesapKimligi: silinen } = await hesapAc(h.vt, "musteri", {
      eposta: `bulunan-${ek}-eski@ornek.test`,
      sifre: "uzun-bir-sifre-123",
    });
    await h.vt
      .update(musteriler)
      .set({ silinme_zamani: sql`now()` })
      .where(eq(musteriler.kimlik, silinen));
    expect(await elleSiparisMusterileri(h.vt, `bulunan-${ek}`)).toEqual([
      { kimlik: hesapKimligi, eposta: expect.stringMatching(/bulunan/iu), sonTeslimat: null },
    ]);
    await odeme.elleSiparisVer(
      h.vt,
      randomUUID(),
      elle([{ birim, adet: 1 }], { musteri: { tur: "uye", kimlik: hesapKimligi } }),
    );
    const [bulunan] = await elleSiparisMusterileri(h.vt, `BULUNAN-${ek}`);
    expect(bulunan?.sonTeslimat).toMatchObject({ ad: "Deniz", adres: { il: "TR-06" } });
    // Joker yok.
    expect(await elleSiparisMusterileri(h.vt, "%")).toEqual([]);
    await h.vt
      .update(siparisler)
      .set({ kisisel_veri_silinme_zamani: sql`now()` })
      .where(eq(siparisler.musteri_kimligi, hesapKimligi));
    expect((await elleSiparisMusterileri(h.vt, `bulunan-${ek}`))[0]?.sonTeslimat).toBeNull();
  });

  it("bir sitenin ürünü öteki sitenin elle siparişine girmez", async () => {
    const a = await hazirla("elle-siparis-a");
    const b = await hazirla("elle-siparis-b");
    const birim = await a.urunAc();
    expect(
      await hatasi(odeme.elleSiparisVer(b.vt, randomUUID(), elle([{ birim, adet: 1 }]))),
    ).toMatchObject({
      kod: "is-kurali",
    });
    expect(await elleSiparisUrunleri(b.vt, site, "Ürün")).toEqual([]);
    expect(await oturumSayisi(b.vt)).toBe(0);
  });
});

const oturumSayisi = async (vt: Veritabani) =>
  (await vt.execute<{ n: number }>(sql`select count(*)::int as n from ${odemeOturumlari}`)).rows[0]
    ?.n ?? 0;
