// Kuponlu ödeme, sipariş, iptal ve iade gerçek veritabanıyla (kart 0312, karar 0185, karar 0187). Site vergi dahil
// girişli (Genel %18); kargo 59,00 ve vergisiz (kargo sınıfı yok). Tutarlar elle hesaplanır.
// - Sipariş kuponun kodunu, türünü, indirimini ve kalemlerin payını saklar; kalemin vergisiz tutarı ve vergisi
//   kupondan sonradır; ara toplam − indirim + kargo toplamdır. Kullanım siparişe bağlanır.
// - Kişi başı sınır ödemede e-postayla sayılır; iptalde ve tam iadede hak geri verilir, kısmi iadede verilmez.
// - Kısmi iade kalemin ödenen tutarını döndürür; ücretsiz kargo kuponunda kargo iadesi yoktur.
// - Aynı anda dört siparişte toplam sınır (1) aşılmaz.
// - Kartla ödemede sipariş bankadan dönüşte kurulurken kupon oturumun açıldığı ana göre denetlenir; ayırmanın süresi
//   dolup sınır başkasınca doldurulduysa sipariş kurulmaz.
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { eq, sql } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type Site, siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import { baglantiyiKapat } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { siteninFiyatServisi } from "../../fiyat/servis.ts";
import { siteninServisi } from "../../magaza-ayarlari/servis.ts";
import { eklentiliSiparisiKur, SiparisKurulamadi } from "../../odeme/oturum-hesabi.ts";
import { type OdemeYontemiSecimi, odemeBilgileriSemasi } from "../../odeme/semalar.ts";
import { odemeServisi } from "../../odeme/servis.ts";
import { iadeServisi } from "../../siparis/iade.ts";
import { siparisIadeleri, siparisKalemleri, siparisler } from "../../siparis/model.ts";
import { kisiselVeriTemizligi } from "../../siparis/temizlik.ts";
import { siparisYonetimi } from "../../siparis/yonetim.ts";
import { stokServisi } from "../../stok/servis.ts";
import { urunServisi } from "../../urun/servis.ts";
import { siteninVergiServisi } from "../../vergi/servis.ts";
import { kuponKullanimlari, kuponlar } from "../model.ts";
import { kuponServisi } from "../servis.ts";

vi.setConfig({ testTimeout: 90_000 });

const klasor = siteKlasorunuOku(
  resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler/vergi-dolu"),
);
const firmaKimligi = randomUUID();
const site: Site = {
  ...klasor,
  baslangic: {
    ...klasor.baslangic,
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
const yapan = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });
const urunSrv = urunServisi(() => site.ayarlar.saatDilimi);
const odeme = odemeServisi(site);
const iade = iadeServisi(site);
const yonetim = siparisYonetimi(site);

const temizlenecekler: (() => Promise<void>)[] = [];
afterEach(async () => {
  await baglantiyiKapat();
  for (const temizle of temizlenecekler.splice(0)) await temizle();
});

const hatasi = async (is: Promise<unknown>) => {
  try {
    await is;
  } catch (hata) {
    if (hata instanceof BilinenHata) return { kod: hata.kod, ayrinti: hata.ayrinti };
    throw hata;
  }
  throw new Error("Hata bekleniyordu.");
};

const kapida: OdemeYontemiSecimi = { yontem: "kapida-odeme", secenek: "nakit" };
const bilgiler = (yontem: OdemeYontemiSecimi = kapida) =>
  odemeBilgileriSemasi.parse({
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
  });

const hazirla = async (ad = "kuponsiparis") => {
  const deneme = await denemeSitesiAc(ad);
  temizlenecekler.push(deneme.sil);
  const vt = deneme.vt;
  await siteninServisi(site).degistir(vt, yapan(), { kargoUcreti: 5_900 });
  const genel = (await siteninVergiServisi(site).tabloyuOku(vt)).find(
    (sinif) => sinif.ad === "Genel",
  )?.kimlik;
  if (genel === undefined) throw new Error("Genel sınıf yok.");
  const urunAc = async (satis = 11_800) => {
    const urun = await urunSrv.urunEkle(vt, yapan(), {
      ad: `Ürün ${randomUUID().slice(0, 8)}`,
      vergiSinifi: genel,
      durum: "yayinda",
    });
    const birim = (await urunSrv.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
    await siteninFiyatServisi(site).fiyatYaz(vt, yapan(), birim, { satisFiyati: satis });
    await stokServisi().stokDuzelt(vt, yapan(), birim, {
      yeniMiktar: 50,
      gorulenMiktar: 0,
      sebep: "sayim",
    });
    return birim;
  };
  const kuponAc = (girdi: Partial<Parameters<ReturnType<typeof kuponServisi>["ekle"]>[2]> = {}) =>
    vt.transaction((islem) =>
      kuponServisi(site).ekle(islem, yapan(), {
        kod: "YUZDE10",
        tur: "yuzde",
        deger: 10,
        kapsam: "hepsi",
        ...girdi,
      }),
    );
  const ver = async (
    kalemler: { birim: string; adet: number }[],
    kupon: string | undefined,
    eposta = "misafir@ornek.test",
  ) =>
    (
      await odeme.siparisVer(
        vt,
        {
          kim: { tur: "misafir", eposta, hesap: { ac: false } },
          bilgiler: bilgiler(),
          kalemler,
          kupon,
        },
        3600,
      )
    ).siparis.numara;
  const oku = async (numara: string) => {
    const [satir] = await vt.select().from(siparisler).where(eq(siparisler.numara, numara));
    if (satir === undefined) throw new Error("Sipariş yok.");
    const kalemler = await vt
      .select()
      .from(siparisKalemleri)
      .where(eq(siparisKalemleri.siparis_kimligi, satir.kimlik))
      .orderBy(siparisKalemleri.sira);
    return { ...satir, kalemler };
  };
  const kullanimlar = () => vt.select().from(kuponKullanimlari);
  const teslimEt = async (numara: string) => {
    await yonetim.islemYap(vt, yapan(), {
      numara,
      islem: "hazirlamaya-al",
      gorulenDurum: "odeme-bekleniyor",
    });
    await yonetim.islemYap(vt, yapan(), {
      numara,
      islem: "kargoya-ver",
      gorulenDurum: "hazirlaniyor",
      kargo: { firma: firmaKimligi },
    });
    await yonetim.islemYap(vt, yapan(), {
      numara,
      islem: "teslim-edildi",
      gorulenDurum: "kargoda",
    });
  };
  return { vt, urunAc, kuponAc, ver, oku, kullanimlar, teslimEt };
};

describe("kuponlu sipariş", () => {
  it("sipariş kuponu, indirimi ve kalemlerin payını saklar; vergi kupondan sonradır; kullanım siparişe bağlanır", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    const b = await h.urunAc(23_600);
    await h.kuponAc();
    const numara = await h.ver(
      [
        { birim: a, adet: 1 },
        { birim: b, adet: 1 },
      ],
      "yuzde10",
    );
    const siparis = await h.oku(numara);
    // 354,00 × %10 = 35,40: 11,80 + 23,60. Kalanlar 106,20 ve 212,40; vergileri 16,20 ve 32,40.
    expect(siparis).toMatchObject({
      kupon_kodu: "YUZDE10",
      kupon_turu: "yuzde",
      kupon_indirimi: 3_540,
      kupon_kargo_indirimi: 0,
      ara_toplam: 35_400,
      kargo_turu: "ucretli",
      kargo_tutari: 5_900,
      vergi_toplami: 4_860,
      toplam: 37_760,
    });
    expect(siparis.kalemler.map((k) => [k.tutar, k.indirim, k.vergisiz, k.vergi])).toEqual([
      [11_800, 1_180, 9_000, 1_620],
      [23_600, 2_360, 18_000, 3_240],
    ]);
    expect(siparis.ara_toplam - siparis.kupon_indirimi + siparis.kargo_tutari).toBe(siparis.toplam);
    expect(await h.kullanimlar()).toEqual([
      expect.objectContaining({
        siparis_kimligi: siparis.kimlik,
        eposta: "misafir@ornek.test",
        serbest_zamani: null,
      }),
    ]);
  });

  it("kuponsuz sipariş kupon alanlarını boş bırakır", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    const siparis = await h.oku(await h.ver([{ birim: a, adet: 1 }], undefined));
    expect(siparis).toMatchObject({ kupon_kodu: null, kupon_turu: null, kupon_indirimi: 0 });
    expect(siparis.kalemler[0]?.indirim).toBe(0);
  });

  it("geçmeyen kupon onayı nedeniyle durdurur, hiçbir şey yazılmaz", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    await h.kuponAc({ enAzTutar: 50_000 });
    expect(await hatasi(h.ver([{ birim: a, adet: 1 }], "YUZDE10"))).toEqual({
      kod: "is-kurali",
      ayrinti: [{ alan: "kupon", kod: "kupon-gecmedi", neden: "en-az", kalan: 38_200 }],
    });
    expect(await h.vt.select().from(siparisler)).toEqual([]);
    expect(await h.kullanimlar()).toEqual([]);
  });

  it("kişi başı sınır ödemede e-postayla (harf ayrımsız) sayılır; iptal hakkı geri verir", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    await h.kuponAc({ kisiBasiSinir: 1 });
    const ilk = await h.ver([{ birim: a, adet: 1 }], "YUZDE10", "Ayse@Ornek.Test");
    expect(await hatasi(h.ver([{ birim: a, adet: 1 }], "YUZDE10", "ayse@ornek.test"))).toEqual({
      kod: "is-kurali",
      ayrinti: [{ alan: "kupon", kod: "kupon-gecmedi", neden: "kullanildi" }],
    });
    await iade.iadeYap(h.vt, yapan(), {
      numara: ilk,
      tur: "iptal",
      gorulenDurum: "odeme-bekleniyor",
      kalemler: [],
      kargo: false,
      stogaKoy: true,
      neden: "musteri-vazgecti",
    });
    expect((await h.kullanimlar())[0]?.serbest_zamani).not.toBeNull();
    await h.ver([{ birim: a, adet: 1 }], "YUZDE10", "ayse@ornek.test");
  });

  it("kısmi iade kalemin ödenen tutarını döndürür ve hakkı geri vermez; tam iade geri verir", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    await h.kuponAc({ toplamSinir: 1 });
    const numara = await h.ver([{ birim: a, adet: 2 }], "YUZDE10");
    // 236,00 − 23,60 = 212,40: kalem başına 106,20 (90,00 + 16,20).
    await h.teslimEt(numara);
    const girdi = {
      numara,
      tur: "iade" as const,
      gorulenDurum: "teslim-edildi" as const,
      stogaKoy: true,
      neden: "beklentiyi-karsilamadi" as const,
    };
    await iade.iadeYap(h.vt, yapan(), { ...girdi, kalemler: [{ sira: 0, adet: 1 }], kargo: false });
    const ilk = (await h.vt.select().from(siparisIadeleri))[0];
    expect(ilk).toMatchObject({ tutar: 10_620, kalemler: [{ sira: 0, adet: 1, tutar: 10_620 }] });
    expect(ilk?.vergi_dokumu.map((satir) => [satir.matrah, satir.vergi])).toEqual([[9_000, 1_620]]);
    expect((await h.kullanimlar())[0]?.serbest_zamani).toBeNull();
    // Kalan adet ve kargo: 106,20 + 59,00. Siparişin tamamı iade edildi, hak geri verilir.
    await iade.iadeYap(h.vt, yapan(), {
      ...girdi,
      gorulenDurum: "kismi-iade",
      kalemler: [{ sira: 0, adet: 1 }],
      kargo: true,
    });
    const iadeler = await h.vt.select().from(siparisIadeleri);
    expect(iadeler.map((satir) => satir.tutar).sort()).toEqual([10_620, 16_520]);
    expect((await h.oku(numara)).durum).toBe("iade-edildi");
    expect((await h.kullanimlar())[0]?.serbest_zamani).not.toBeNull();
    // Sınır (1) yeniden açıldı.
    await h.ver([{ birim: a, adet: 1 }], "YUZDE10", "baska@ornek.test");
  });

  it("ücretsiz kargo kuponu: kargo ücretsiz, verilmeyen ücret saklanır; tam iade ödenen toplamdır", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    await h.kuponAc({ kod: "KARGOBEDAVA", tur: "ucretsiz-kargo", deger: 0 });
    const numara = await h.ver([{ birim: a, adet: 1 }], "kargobedava");
    expect(await h.oku(numara)).toMatchObject({
      kupon_turu: "ucretsiz-kargo",
      kupon_indirimi: 0,
      kupon_kargo_indirimi: 5_900,
      kargo_turu: "ucretsiz",
      kargo_tutari: 0,
      toplam: 11_800,
    });
    await h.teslimEt(numara);
    await iade.iadeYap(h.vt, yapan(), {
      numara,
      tur: "iade",
      gorulenDurum: "teslim-edildi",
      kalemler: [{ sira: 0, adet: 1 }],
      kargo: true,
      stogaKoy: true,
      neden: "beklentiyi-karsilamadi",
    });
    expect((await h.vt.select().from(siparisIadeleri))[0]).toMatchObject({ tutar: 11_800 });
  });

  it("kişisel veri temizliği kullanımın e-postasını siler; kullanım siparişe bağlı ve sayılı kalır", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    await h.kuponAc({ toplamSinir: 5 });
    const numara = await h.ver([{ birim: a, adet: 1 }], "YUZDE10", "temizlik@ornek.test");
    const yil = site.ayarlar.kisiselVeriSaklamaYili;
    await h.vt.execute(
      sql`update siparisler set olusturma_zamani = now() - make_interval(years => ${yil}, days => 1) where numara = ${numara}`,
    );
    expect(await kisiselVeriTemizligi(h.vt, site)).toBe(1);
    expect(await h.kullanimlar()).toEqual([
      expect.objectContaining({ eposta: null, siparis_kimligi: (await h.oku(numara)).kimlik }),
    ]);
  });

  it("aynı anda dört siparişte toplam sınır (1) aşılmaz", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    await h.kuponAc({ toplamSinir: 1 });
    const sonuclar = await Promise.allSettled(
      [1, 2, 3, 4].map((sira) => h.ver([{ birim: a, adet: 1 }], "YUZDE10", `k${sira}@ornek.test`)),
    );
    expect(sonuclar.filter((sonuc) => sonuc.status === "fulfilled")).toHaveLength(1);
    expect(await h.vt.select().from(siparisler)).toHaveLength(1);
    expect((await h.kullanimlar()).filter((satir) => satir.siparis_kimligi !== null)).toHaveLength(
      1,
    );
  });
});

describe("kartla ödemenin dönüşünde kupon", () => {
  const karttan = (h: Awaited<ReturnType<typeof hazirla>>, oturum: string, tutar: number) =>
    eklentiliSiparisiKur(
      h.vt,
      site,
      {
        oturum,
        odeme: { yontem: "kart" },
        tahsilat: { odenen: tutar, taksit: 1, odemeKimligi: randomUUID() },
        tutar,
        paraBirimi: site.ayarlar.paraBirimi,
      },
      { once: async () => {}, sonra: async () => {} },
    );
  const oturumAc = async (
    h: Awaited<ReturnType<typeof hazirla>>,
    birim: string,
    eposta: string,
  ) => {
    const { oturum } = await odeme.odemeOturumuAc(
      h.vt,
      {
        kim: { tur: "misafir", eposta, hesap: { ac: false } },
        bilgiler: bilgiler(),
        kalemler: [{ birim, adet: 1 }],
        kupon: "YUZDE10",
      },
      3600,
    );
    return oturum;
  };

  it("kupon oturumdan sonra bitse de sipariş oturumun açıldığı ana göre kurulur", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    const kupon = await h.kuponAc({ toplamSinir: 1 });
    const oturum = await oturumAc(h, a, "kart@ornek.test");
    // Kullanım oturumla aynı işlemde, siparişe bağlanmadan ayrılır.
    expect(await h.kullanimlar()).toEqual([
      expect.objectContaining({
        oturum_kimligi: oturum,
        siparis_kimligi: null,
        kupon_kimligi: kupon,
      }),
    ]);
    await h.vt.update(kuponlar).set({ bitis_zamani: new Date() }).where(eq(kuponlar.kimlik, kupon));
    // 118,00 − 11,80 + 59,00.
    const siparis = await karttan(h, oturum, 16_520);
    expect(await h.oku(siparis.numara)).toMatchObject({ kupon_indirimi: 1_180, toplam: 16_520 });
  });

  it("ayırmanın süresi dolup sınır başkasınca doldurulduysa sipariş kurulmaz", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    await h.kuponAc({ toplamSinir: 1 });
    const oturum = await oturumAc(h, a, "kart@ornek.test");
    await h.vt.execute(
      sql`update kupon_kullanimlari set bitis_zamani = now() - interval '1 millisecond'`,
    );
    await h.ver([{ birim: a, adet: 1 }], "YUZDE10", "baska@ornek.test");
    await expect(karttan(h, oturum, 16_520)).rejects.toEqual(
      new SiparisKurulamadi("sepet-degisti"),
    );
    expect(await h.vt.select().from(siparisler)).toHaveLength(1);
  });
});
