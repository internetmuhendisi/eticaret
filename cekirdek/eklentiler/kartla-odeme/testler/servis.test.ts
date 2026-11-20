// Kartla ödeme eklentisi gerçek veritabanı ve yerel sahte ödeme kuruluşuyla (kart 0215, karar 0142):
// - Eklenti kapalıyken, anahtarı yokken ve para birimini kuruluş desteklemezken "Kartla öde" yoktur, başlatılmaz.
// - Başarılı ödeme: müşteri kuruluşun sayfasına gider, sonuç kuruluşa sorulur, sipariş "hazırlanıyor" ve tahsilatla
//   kurulur, stok düşer, ayırma siparişe geçer. Taksitli ödemede ödenen tutar ve taksit siparişte.
// - Başarısız ödemede sipariş yok, ayırma bırakılır; sonucu bilinmeyen ödeme bekler, uzun süre sonra başarısız sayılır.
// - Tarayıcının dönüşü yalnız belirteci getirir: kuruluş ödendi demedikçe sipariş kurulmaz.
// - İmzasız ve yanlış imzalı bildirim reddedilir; aynı dönüş ve bildirim iki kez ve aynı anda gelse de sipariş bir kez.
// - Ödeme alındı ama stok yoksa ya da fiyat değiştiyse ödeme iptal edilir; iptal edilemezse ödeme bekler.
// - Kuruluşa ulaşılamazsa ya da sonucun imzası tutmazsa sipariş kurulmaz.
// - Günlük karşılaştırma üç uyuşmazlığı bulur; taksit tablosu ayara göre; iki site ayrı.
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { and, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { arkaPlanIsleri } from "../../../arka-plan-isleri/model.ts";
import { calisanSite } from "../../../ayar-semasi/calisan-site.ts";
import { type Site, siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import {
  kartlaOdemeBildirimUcu,
  kartlaOdemeDonusUcu,
  kartlaOdemeTaksitlerUcu,
} from "../../../kapi/herkese-acik/kartla-odeme.ts";
import { ucTanimla } from "../../../kapi/uc.ts";
import { BilinenHata, Yonlendirme } from "../../../kapi/zarf.ts";
import { sistemIslemi } from "../../../kayitlar/degisiklik-islemleri.ts";
import { kartOdemesiDurumlari } from "../../../kayitlar/eklentiler.ts";
import { siteninFiyatServisi } from "../../../moduller/fiyat/servis.ts";
import { siteninServisi } from "../../../moduller/magaza-ayarlari/servis.ts";
import { odemeOturumlari } from "../../../moduller/odeme/model.ts";
import { odemeBilgileriSemasi } from "../../../moduller/odeme/semalar.ts";
import { odemeServisi } from "../../../moduller/odeme/servis.ts";
import { eskiOdemeOturumlariniSil } from "../../../moduller/odeme/temizlik.ts";
import { kullanilabilirYontemler, odemeYontemiServisi } from "../../../moduller/odeme/yontemler.ts";
import { iadeServisi } from "../../../moduller/siparis/iade.ts";
import { siparisIadeleri, siparisKalemleri, siparisler } from "../../../moduller/siparis/model.ts";
import { siparisServisi } from "../../../moduller/siparis/servis.ts";
import { siparisYonetimi } from "../../../moduller/siparis/yonetim.ts";
import { birimStoklari, stokAyirmalari } from "../../../moduller/stok/model.ts";
import { stokServisi } from "../../../moduller/stok/servis.ts";
import { urunServisi } from "../../../moduller/urun/servis.ts";
import { baglantiyiKapat, type Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { kartlaOdemeHazirMi } from "../baslat.ts";
import { belirsizIadeleriSor, iadeyiDagit, kartlaIadeEt } from "../iade.ts";
import { kurulusAdresi } from "../iyzico.ts";
import { kartIadeleri, kartOdemeleri } from "../model.ts";
import { donusSemasi } from "../semalar.ts";
import { kartlaOdemeServisi } from "../servis.ts";
import { type SahteKurulus, sahteKurulusAc } from "./sahte-kurulus.ts";

vi.setConfig({ testTimeout: 60_000 });

const anahtar = "deneme-anahtari";
const gizli = "deneme-gizli-anahtari";
const yapan = sistemIslemi("test");

const kargoFirmasi = randomUUID();
const okunan = siteKlasorunuOku(
  resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler/gecerli"),
);
// Testlerin ortak deneme sitesinde eklenti kapalıdır (öteki testlerin yöntem listesi değişmesin): burada açılır;
// başlangıçta kart açık, en çok 6 taksit.
const site: Site = {
  ...okunan,
  ayarlar: { ...okunan.ayarlar, eklentiler: [...okunan.ayarlar.eklentiler, "kartla-odeme"] },
  baslangic: {
    ...okunan.baslangic,
    odemeYontemleri: [
      { kod: "kart", acik: true },
      { kod: "kapida-odeme", acik: true },
    ],
    kartlaOdemeEnCokTaksit: 6,
    kargoFirmalari: [{ kimlik: kargoFirmasi, ad: "Deneme Kargo" }],
  },
};
const kapali: Site = { ...site, ayarlar: { ...site.ayarlar, eklentiler: [] } };

const ortakAnahtar = Symbol.for("cekirdek.calisanSite");
const ortak = globalThis as { [ortakAnahtar]?: unknown };

let vt: Veritabani;
let sil: () => Promise<void>;
let vtB: Veritabani;
let silB: () => Promise<void>;
let kurulus: SahteKurulus;

beforeAll(async () => {
  kurulus = await sahteKurulusAc({ anahtar, gizli });
  const [a, b] = await Promise.all([
    denemeSitesiAc("kartla-odeme"),
    denemeSitesiAc("kartla-odeme-b"),
  ]);
  ({ vt, sil } = a);
  ({ vt: vtB, sil: silB } = b);
  vi.stubEnv("KARTLA_ODEME_ANAHTARI", anahtar);
  vi.stubEnv("KARTLA_ODEME_GIZLI_ANAHTARI", gizli);
  vi.stubEnv("KARTLA_ODEME_DENEME_ADRESI", kurulus.adres);
  vi.stubEnv("SITE_ADRESI", "https://magaza.ornek.test");
  vi.stubEnv("VERITABANI_ADRESI", a.baglantiAdresi);
  vi.stubEnv("IKI_ASAMA_ANAHTARI", randomBytes(32).toString("hex"));
  vi.stubEnv(
    "SITE_KLASORU",
    resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler/gecerli"),
  );
  await baglantiyiKapat();
  calisanSite();
  ortak[ortakAnahtar] = site;
});
afterAll(async () => {
  await baglantiyiKapat();
  vi.unstubAllEnvs();
  await Promise.all([sil(), silB(), kurulus.kapat()]);
});

const servis = kartlaOdemeServisi(site);
const urunSrv = urunServisi(() => site.ayarlar.saatDilimi);

const birimAc = async (miktar = 5, veritabani: Veritabani = vt) => {
  const urun = await urunSrv.urunEkle(veritabani, yapan, {
    ad: `Kart denemesi ${randomBytes(4).toString("hex")}`,
    vergiSinifi: null,
    durum: "yayinda",
  });
  const birim = (await urunSrv.urunuOku(veritabani, urun))?.birimler[0]?.kimlik ?? "";
  await siteninFiyatServisi(site).fiyatYaz(veritabani, yapan, birim, { satisFiyati: 15_000 });
  await stokServisi().stokDuzelt(veritabani, yapan, birim, {
    yeniMiktar: miktar,
    gorulenMiktar: 0,
    sebep: "sayim",
  });
  return birim;
};

const bilgiler = () =>
  odemeBilgileriSemasi.parse({
    odemeYontemi: { yontem: "kart" },
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

// "Siparişi onayla": oturum, ayırma ve kuruluşta ödeme formu.
const baslat = async (birim: string, adet = 1, kullanilan: Site = site, veritabani = vt) => {
  const sonuc = await odemeServisi(kullanilan).onayla(
    veritabani,
    {
      kim: {
        tur: "misafir",
        eposta: `kart-${randomBytes(4).toString("hex")}@ornek.test`,
        hesap: { ac: false },
      },
      bilgiler: bilgiler(),
      kalemler: [{ birim, adet }],
      ip: "203.0.113.5",
    },
    3600,
  );
  if (sonuc.tur !== "yonlendir") throw new Error("Kartla ödeme yönlendirmeliydi.");
  const [odeme] = await veritabani
    .select()
    .from(kartOdemeleri)
    .where(eq(kartOdemeleri.oturum_kimligi, sonuc.oturum));
  if (odeme === undefined) throw new Error("Kart ödemesi yazılmadı.");
  return { ...sonuc, belirtec: odeme.belirtec };
};

const odemeAyarla = (
  belirtec: string,
  sonuc: "basarili" | "basarisiz" | "bekliyor" | "sahtecilik",
  taksit = 1,
) => {
  const odeme = kurulus.odemeler.get(belirtec);
  if (odeme === undefined) throw new Error("Kuruluşta ödeme yok.");
  odeme.sonuc = sonuc;
  odeme.taksit = taksit;
  return odeme;
};

const odemeSatiri = async (belirtec: string, veritabani = vt) =>
  (await veritabani.select().from(kartOdemeleri).where(eq(kartOdemeleri.belirtec, belirtec)))[0];
const oturumunSiparisleri = (oturum: string) =>
  vt.select().from(siparisler).where(eq(siparisler.oturum_kimligi, oturum));
const ayirmalar = (oturum: string) =>
  vt.select().from(stokAyirmalari).where(eq(stokAyirmalari.oturum_kimligi, oturum));
const stogu = async (birim: string) =>
  (await vt.select().from(birimStoklari).where(eq(birimStoklari.birim_kimligi, birim)))[0]?.miktar;

const anahtari = (cerez: string | null) => /^siparis-erisim=([^;]+)/.exec(cerez ?? "")?.[1];

const hatasi = async (is: Promise<unknown>) => {
  const hata = await is.then(
    () => undefined,
    (yakalanan: unknown) => yakalanan,
  );
  if (!(hata instanceof BilinenHata)) throw new Error(`Bilinen hata beklenirdi: ${String(hata)}`);
  return { kod: hata.kod, ayrinti: hata.ayrinti };
};

const donus = (belirtec: string, ek: Record<string, string> = {}) =>
  kartlaOdemeDonusUcu(
    new Request("http://yerel/kapi/herkese-acik/kartla-odeme/donus", {
      method: "POST",
      // Kuruluşun sayfasından gelen form: başka siteden.
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "sec-fetch-site": "cross-site",
        origin: "https://sandbox-api.iyzipay.com",
      },
      body: new URLSearchParams({ token: belirtec, ...ek }).toString(),
    }),
  );

const bildirimImzasi = (govde: Record<string, string>, anahtarIle = gizli) =>
  createHmac("sha256", anahtarIle)
    .update(
      anahtarIle +
        govde.iyziEventType +
        govde.iyziPaymentId +
        govde.token +
        govde.paymentConversationId +
        govde.status,
    )
    .digest("hex");
const bildirim = (govde: Record<string, string>, imza?: string) =>
  kartlaOdemeBildirimUcu(
    new Request("http://yerel/kapi/herkese-acik/kartla-odeme/bildirim", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(imza === undefined ? {} : { "x-iyz-signature-v3": imza }),
      },
      body: JSON.stringify(govde),
    }),
  );
const bildirimGovdesi = (belirtec: string, oturum: string) => ({
  paymentConversationId: oturum,
  merchantId: "1",
  token: belirtec,
  status: "SUCCESS",
  iyziReferenceCode: "r",
  iyziEventType: "CHECKOUT_FORM_AUTH",
  iyziEventTime: String(Date.now()),
  iyziPaymentId: kurulus.odemeler.get(belirtec)?.odemeKimligi ?? "",
});

// Kuyruktaki yönetici bildirimleri, anahtarıyla (kart 0241).
const yoneticiBildirimleri = async (anahtar: string) =>
  (
    await vt
      .select({ girdi: arkaPlanIsleri.girdi })
      .from(arkaPlanIsleri)
      .where(
        and(
          eq(arkaPlanIsleri.tur, "yonetici-bildirimi"),
          eq(arkaPlanIsleri.tekillik_anahtari, `yonetici-bildirimi:${anahtar}`),
        ),
      )
  ).map((satir) => satir.girdi);

describe("kartla öde ödeme adımında", () => {
  it("eklenti açık ve hazırken görünür; kapalı, anahtarsız ve adressiz sitede görünmez", async () => {
    const ayarlar = await siteninServisi(site).oku(vt);
    expect(kullanilabilirYontemler(site, ayarlar)).toContainEqual({ yontem: "kart" });
    expect(kullanilabilirYontemler(kapali, ayarlar)).not.toContainEqual({ yontem: "kart" });
    // Başlatmanın kendi denetimi de (ikinci katman: ödeme servisi yöntemi önce reddeder).
    expect(kartlaOdemeHazirMi(site)).toBe(true);
    expect(kartlaOdemeHazirMi(kapali)).toBe(false);
    vi.stubEnv("SITE_ADRESI", "");
    const adressiz: Site = { ...site, kimlik: { ...site.kimlik, adresler: {} } };
    try {
      expect(kullanilabilirYontemler(adressiz, ayarlar)).not.toContainEqual({ yontem: "kart" });
    } finally {
      vi.stubEnv("SITE_ADRESI", "https://magaza.ornek.test");
    }
    vi.stubEnv("KARTLA_ODEME_GIZLI_ANAHTARI", "");
    try {
      expect(kullanilabilirYontemler(site, ayarlar)).not.toContainEqual({ yontem: "kart" });
    } finally {
      vi.stubEnv("KARTLA_ODEME_GIZLI_ANAHTARI", gizli);
    }
  });

  it("kapalı eklentide başlatılmaz (yontem-kapali), panelde yöntem görünmez ama kaydı korunur", async () => {
    const birim = await birimAc();
    const hata = await hatasi(
      odemeServisi(kapali).onayla(
        vt,
        {
          kim: { tur: "misafir", eposta: "kapali@ornek.test", hesap: { ac: false } },
          bilgiler: bilgiler(),
          kalemler: [{ birim, adet: 1 }],
        },
        3600,
      ),
    );
    expect(hata.ayrinti).toEqual([{ alan: "bilgiler.odemeYontemi", kod: "yontem-kapali" }]);
    const panel = await odemeYontemiServisi(kapali).oku(vt);
    expect(panel.yontemler.map((yontem) => yontem.kod)).not.toContain("kart");
    // Kapalı eklentide kaydedilen liste kartın yerini ve açıklığını silmez.
    await odemeYontemiServisi(kapali).yontemleriDegistir(vt, yapan, {
      yontemler: panel.yontemler,
      kapidaOdemeSecenekleri: ["nakit"],
      havaleIptalSuresi: "3",
    });
    const sonra = await odemeYontemiServisi(site).oku(vt);
    expect(sonra.yontemler).toContainEqual({ kod: "kart", acik: true });
  });
});

describe("ödeme", () => {
  it("başarılı: kuruluşun formu oturumun tutarı ve kalemleriyle açılır, sipariş hazırlanıyor ve tahsilatla kurulur", async () => {
    const birim = await birimAc(5);
    const { oturum, adres, belirtec } = await baslat(birim, 2);
    expect(adres).toBe(`${kurulus.adres}/odeme-sayfasi/${belirtec}`);
    const kurulustaki = odemeAyarla(belirtec, "basarili");
    expect(kurulustaki.tutar).toBe("300.00");
    expect(kurulustaki.taksitler).toEqual([1, 2, 3, 6]);
    expect(kurulustaki.donusAdresi).toBe(
      "https://magaza.ornek.test/kapi/herkese-acik/kartla-odeme/donus",
    );
    expect((await odemeSatiri(belirtec))?.durum).toBe("baslatildi");
    expect(await ayirmalar(oturum)).toHaveLength(1);

    const sonuc = await servis.tamamla(vt, belirtec, { erisimVer: true });
    expect(sonuc).toMatchObject({ tur: "siparis" });
    const [siparis] = await oturumunSiparisleri(oturum);
    expect(siparis).toMatchObject({
      durum: "hazirlaniyor",
      odeme_yontemi: "kart",
      toplam: 30_000,
      tahsilat: { odenen: 30_000, taksit: 1, odemeKimligi: kurulustaki.odemeKimligi },
    });
    expect(await stogu(birim)).toBe(3);
    expect(await ayirmalar(oturum)).toEqual([]);
    expect(await odemeSatiri(belirtec)).toMatchObject({
      durum: "odendi",
      odenen: 30_000,
      taksit: 1,
      siparis_kimligi: siparis?.kimlik,
    });
  });

  it("taksitli: ödenen tutar taksit farkıyla ve taksit sayısı siparişte", async () => {
    const birim = await birimAc();
    const { oturum, belirtec } = await baslat(birim);
    odemeAyarla(belirtec, "basarili", 3);
    await servis.tamamla(vt, belirtec, { erisimVer: false });
    const [siparis] = await oturumunSiparisleri(oturum);
    expect(siparis?.tahsilat).toMatchObject({ odenen: 15_300, taksit: 3 });
    expect(siparis?.toplam).toBe(15_000);
  });

  it("başarısız: sipariş kurulmaz, ayırma bırakılır, müşteri reddedildi ile döner", async () => {
    const birim = await birimAc(1);
    const { oturum, belirtec } = await baslat(birim);
    odemeAyarla(belirtec, "basarisiz");
    expect(await servis.tamamla(vt, belirtec, { erisimVer: true })).toEqual({
      tur: "donus",
      sonuc: "reddedildi",
    });
    expect(await oturumunSiparisleri(oturum)).toEqual([]);
    expect(await ayirmalar(oturum)).toEqual([]);
    expect(await stogu(birim)).toBe(1);
    expect((await odemeSatiri(belirtec))?.durum).toBe("basarisiz");
  });

  const yaslandir = (belirtec: string, aralik: string) =>
    vt
      .update(kartOdemeleri)
      .set({ olusturma_zamani: sql`now() - ${aralik}::interval` })
      .where(eq(kartOdemeleri.belirtec, belirtec));

  it("sonucu bilinmeyen ödeme bekler; tarama 40 dakikada bekletir, 3 saatte başarısız sayar", async () => {
    const birim = await birimAc();
    const { oturum, belirtec } = await baslat(birim);
    // Müşteri henüz ödemedi: gerçek kuruluş "ödeme bilgisi bulunamadı" der (ölçüldü); başarısız sayılmaz.
    expect(await servis.tamamla(vt, belirtec, { erisimVer: true })).toMatchObject({
      tur: "donus",
      sonuc: "yarida-kaldi",
    });
    expect((await odemeSatiri(belirtec))?.durum).toBe("baslatildi");
    expect(await ayirmalar(oturum)).toHaveLength(1);
    await yaslandir(belirtec, "40 minutes");
    await servis.bekleyenleriSor(vt);
    expect(await odemeSatiri(belirtec)).toMatchObject({
      durum: "baslatildi",
      son_sorgu_zamani: expect.any(Date),
    });
    await yaslandir(belirtec, "3 hours");
    await servis.bekleyenleriSor(vt);
    expect((await odemeSatiri(belirtec))?.durum).toBe("basarisiz");
    expect(await ayirmalar(oturum)).toEqual([]);
  });

  it("sahtecilik incelemesindeki ödeme süre dolsa da başarısız sayılmaz; kuruluş reddederse başarısızdır", async () => {
    const birim = await birimAc();
    const { oturum, belirtec } = await baslat(birim);
    odemeAyarla(belirtec, "sahtecilik");
    expect(await servis.tamamla(vt, belirtec, { erisimVer: true })).toMatchObject({
      sonuc: "yarida-kaldi",
    });
    await yaslandir(belirtec, "3 hours");
    await servis.bekleyenleriSor(vt);
    expect((await odemeSatiri(belirtec))?.durum).toBe("baslatildi");
    // İnceleme onaylanınca sipariş kurulur.
    odemeAyarla(belirtec, "basarili");
    await servis.bekleyenleriSor(vt);
    expect(await oturumunSiparisleri(oturum)).toHaveLength(1);

    const ikinci = await baslat(await birimAc());
    odemeAyarla(ikinci.belirtec, "sahtecilik-red");
    expect(await servis.tamamla(vt, ikinci.belirtec, { erisimVer: true })).toEqual({
      tur: "donus",
      sonuc: "reddedildi",
    });
  });

  it("kuruluşun geçici hatası ödemeyi başarısız saymaz", async () => {
    const birim = await birimAc();
    const { oturum, belirtec } = await baslat(birim);
    odemeAyarla(belirtec, "basarili");
    kurulus.ariza.geciciHata = true;
    try {
      expect(await servis.tamamla(vt, belirtec, { erisimVer: true })).toMatchObject({
        sonuc: "yarida-kaldi",
      });
    } finally {
      kurulus.ariza.geciciHata = false;
    }
    expect((await odemeSatiri(belirtec))?.durum).toBe("baslatildi");
    expect(await ayirmalar(oturum)).toHaveLength(1);
    await servis.tamamla(vt, belirtec, { erisimVer: false });
    expect(await oturumunSiparisleri(oturum)).toHaveLength(1);
  });

  it("tarama en az sorulandan başlar, sorma süresini geçen ödemeyi sormaz", async () => {
    const birim = await birimAc();
    const eski = await baslat(birim);
    const yeni = await baslat(birim);
    await yaslandir(eski.belirtec, "8 days");
    await yaslandir(yeni.belirtec, "40 minutes");
    await servis.bekleyenleriSor(vt);
    expect((await odemeSatiri(eski.belirtec))?.son_sorgu_zamani).toBeNull();
    expect((await odemeSatiri(yeni.belirtec))?.son_sorgu_zamani).toBeInstanceOf(Date);
  });

  it("tarama müşteri dönmeyen başarılı ödemenin siparişini kurar", async () => {
    const birim = await birimAc();
    const { oturum, belirtec } = await baslat(birim);
    odemeAyarla(belirtec, "basarili");
    await vt
      .update(kartOdemeleri)
      .set({ olusturma_zamani: sql`now() - interval '40 minutes'` })
      .where(eq(kartOdemeleri.belirtec, belirtec));
    await servis.bekleyenleriSor(vt);
    expect(await oturumunSiparisleri(oturum)).toHaveLength(1);
  });
});

describe("dönüş ve bildirim", () => {
  it("tarayıcının dönüşü başarı söylese de kuruluş ödendi demedikçe sipariş kurulmaz", async () => {
    const birim = await birimAc();
    const { oturum, belirtec } = await baslat(birim);
    const yanit = await donus(belirtec, { status: "success", paymentStatus: "SUCCESS" });
    expect(yanit.status).toBe(303);
    expect(yanit.headers.get("location")).toBe("/odeme?kart=yarida-kaldi");
    expect(yanit.headers.get("set-cookie")).toBeNull();
    expect(await oturumunSiparisleri(oturum)).toEqual([]);
  });

  it("başka siteden gelen dönüş kabul edilir; ödendiyse erişim çereziyle sipariş alındı sayfasına gider", async () => {
    const birim = await birimAc();
    const { oturum, belirtec } = await baslat(birim);
    odemeAyarla(belirtec, "basarili");
    const yanit = await donus(belirtec);
    expect(yanit.status).toBe(303);
    expect(yanit.headers.get("location")).toBe("/siparis-alindi");
    expect(yanit.headers.get("cache-control")).toBe("no-store");
    expect(yanit.headers.get("set-cookie")).toMatch(
      /^siparis-erisim=[A-Za-z0-9_-]{40,}; Path=\/siparis-alindi/,
    );
    // İkinci dönüş aynı siparişi bulur ama erişim anahtarı vermez: belirteci sonradan ele geçiren siparişi açamaz,
    // müşterinin erişimini düşüremez (bağımsız kontrolün bulgusu).
    const ikinci = await donus(belirtec);
    expect(ikinci.headers.get("location")).toBe("/siparis-alindi");
    expect(ikinci.headers.get("set-cookie")).toBeNull();
    const ilkAnahtar = anahtari(yanit.headers.get("set-cookie"));
    expect((await siparisServisi(site).erisimleOku(vt, ilkAnahtar))?.siparis.oturum_kimligi).toBe(
      oturum,
    );
    expect(await oturumunSiparisleri(oturum)).toHaveLength(1);
  });

  it("sipariş bildirimle kurulduysa müşterinin ilk dönüşü erişim anahtarını alır, sonrakiler almaz", async () => {
    const birim = await birimAc();
    const { oturum, belirtec } = await baslat(birim);
    odemeAyarla(belirtec, "basarili");
    const govde = bildirimGovdesi(belirtec, oturum);
    expect((await bildirim(govde, bildirimImzasi(govde))).status).toBe(200);
    const ilk = await donus(belirtec);
    const ilkAnahtar = anahtari(ilk.headers.get("set-cookie"));
    expect(ilkAnahtar).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect((await siparisServisi(site).erisimleOku(vt, ilkAnahtar))?.siparis.oturum_kimligi).toBe(
      oturum,
    );
    expect((await donus(belirtec)).headers.get("set-cookie")).toBeNull();
  });

  it("kuruluşa ulaşılamazsa bildirim başarı dönmez (kuruluş yeniden dener)", async () => {
    const birim = await birimAc();
    const { oturum, belirtec } = await baslat(birim);
    odemeAyarla(belirtec, "basarili");
    const govde = bildirimGovdesi(belirtec, oturum);
    kurulus.ariza.ulasilamaz = true;
    try {
      expect((await bildirim(govde, bildirimImzasi(govde))).status).toBe(503);
    } finally {
      kurulus.ariza.ulasilamaz = false;
    }
    expect(await oturumunSiparisleri(oturum)).toEqual([]);
  });

  it("son adet: aynı anda dönüş ve bildirim tek sipariş kurar, ikisi de siparişi bulur", async () => {
    const birim = await birimAc(1);
    const { oturum, belirtec } = await baslat(birim);
    odemeAyarla(belirtec, "basarili");
    const govde = bildirimGovdesi(belirtec, oturum);
    // Önce bildirim kurar; dönüşün ön denetimi stoğu 0 görür, satırı yeniden okuyup siparişi bulmalı.
    expect((await bildirim(govde, bildirimImzasi(govde))).status).toBe(200);
    expect(await stogu(birim)).toBe(0);
    const yanit = await donus(belirtec);
    expect(yanit.headers.get("location")).toBe("/siparis-alindi");
    expect(await oturumunSiparisleri(oturum)).toHaveLength(1);
    expect(kurulus.odemeler.get(belirtec)?.iptal).toBe(false);
    // Aynı anda da.
    const birim2 = await birimAc(1);
    const ikinci = await baslat(birim2);
    odemeAyarla(ikinci.belirtec, "basarili");
    const govde2 = bildirimGovdesi(ikinci.belirtec, ikinci.oturum);
    const yanitlar = await Promise.all([
      donus(ikinci.belirtec),
      bildirim(govde2, bildirimImzasi(govde2)),
    ]);
    expect(yanitlar[0]?.headers.get("location")).toBe("/siparis-alindi");
    expect(yanitlar[1]?.status).toBe(200);
    expect(kurulus.odemeler.get(ikinci.belirtec)?.iptal).toBe(false);
  });

  it("yeniden onay ödemesi dışarıda başlamış oturumu silmez, yalnız ayırmasını bırakır; ödeme sonra gelirse sipariş kurulur", async () => {
    const birim = await birimAc(5);
    const eposta = `yeniden-${randomBytes(4).toString("hex")}@ornek.test`;
    const onayla = (onceki?: string) =>
      odemeServisi(site).onayla(
        vt,
        {
          kim: { tur: "misafir", eposta, hesap: { ac: false } },
          bilgiler: bilgiler(),
          kalemler: [{ birim, adet: 1 }],
          ...(onceki === undefined ? {} : { onceki }),
        },
        3600,
      );
    const ilk = await onayla();
    const [ilkOdeme] = await vt
      .select()
      .from(kartOdemeleri)
      .where(eq(kartOdemeleri.oturum_kimligi, ilk.oturum));
    if (ilkOdeme === undefined) throw new Error("Kart ödemesi yok.");
    await onayla(ilk.oturum);
    expect(await odemeSatiri(ilkOdeme.belirtec)).toMatchObject({ durum: "baslatildi" });
    expect(await ayirmalar(ilk.oturum)).toEqual([]);
    // İlk ödeme sonradan başarılı oldu: sipariş kurulur (stok yeterli).
    odemeAyarla(ilkOdeme.belirtec, "basarili");
    await servis.tamamla(vt, ilkOdeme.belirtec, { erisimVer: false });
    expect(await oturumunSiparisleri(ilk.oturum)).toHaveLength(1);
  });

  it("temizlik ödemesi dışarıda başlamış oturumu 30 gün saklar", async () => {
    const birim = await birimAc();
    const { oturum, belirtec } = await baslat(birim);
    const yasla = (gun: number) =>
      vt
        .update(odemeOturumlari)
        .set({
          olusturma_zamani: sql`now() - make_interval(days => ${gun + 1})`,
          bitis_zamani: sql`now() - make_interval(days => ${gun})`,
        })
        .where(eq(odemeOturumlari.kimlik, oturum));
    await yasla(2);
    await eskiOdemeOturumlariniSil(vt);
    expect(await odemeSatiri(belirtec)).toBeDefined();
    await yasla(31);
    await eskiOdemeOturumlariniSil(vt);
    expect(await odemeSatiri(belirtec)).toBeUndefined();
  });

  it("bilinmeyen belirteç ve bozuk girdi siparişe dokunmaz", async () => {
    expect((await donus(randomUUID())).headers.get("location")).toBe("/odeme?kart=yarida-kaldi");
    expect((await donus("<script>")).status).toBe(400);
  });

  it("imzasız ve yanlış imzalı bildirim reddedilir; doğru imzalı bildirim siparişi kurar", async () => {
    const birim = await birimAc();
    const { oturum, belirtec } = await baslat(birim);
    odemeAyarla(belirtec, "basarili");
    const govde = bildirimGovdesi(belirtec, oturum);
    expect((await bildirim(govde)).status).toBe(403);
    expect((await bildirim(govde, bildirimImzasi(govde, "baska-anahtar"))).status).toBe(403);
    expect((await bildirim({ ...govde, status: "FAILURE" }, bildirimImzasi(govde))).status).toBe(
      403,
    );
    expect(await oturumunSiparisleri(oturum)).toEqual([]);
    const yanit = await bildirim(govde, bildirimImzasi(govde));
    expect(yanit.status).toBe(200);
    expect(await oturumunSiparisleri(oturum)).toHaveLength(1);
  });

  it("aynı anda iki dönüş ve iki bildirim tek sipariş kurar, stok bir kez düşer", async () => {
    const birim = await birimAc(3);
    const { oturum, belirtec } = await baslat(birim);
    odemeAyarla(belirtec, "basarili");
    const govde = bildirimGovdesi(belirtec, oturum);
    const yanitlar = await Promise.all([
      donus(belirtec),
      donus(belirtec),
      bildirim(govde, bildirimImzasi(govde)),
      bildirim(govde, bildirimImzasi(govde)),
    ]);
    expect(yanitlar.map((yanit) => yanit.status)).toEqual([303, 303, 200, 200]);
    expect(yanitlar[0]?.headers.get("location")).toBe("/siparis-alindi");
    expect(yanitlar[1]?.headers.get("location")).toBe("/siparis-alindi");
    expect(await oturumunSiparisleri(oturum)).toHaveLength(1);
    expect(await stogu(birim)).toBe(2);
  });
});

describe("ödeme alındı ama sipariş kurulamadı", () => {
  it("stok bittiyse ödeme iptal edilir, sipariş yok, müşteri stok-yok ile döner", async () => {
    const birim = await birimAc(1);
    const { oturum, belirtec } = await baslat(birim);
    const odeme = odemeAyarla(belirtec, "basarili");
    // Ayırma süresi doldu, ürün başkasına satıldı.
    await vt.delete(stokAyirmalari).where(eq(stokAyirmalari.oturum_kimligi, oturum));
    await stokServisi().stokDuzelt(vt, yapan, birim, {
      yeniMiktar: 0,
      gorulenMiktar: 1,
      sebep: "sayim",
    });
    expect(await servis.tamamla(vt, belirtec, { erisimVer: true })).toEqual({
      tur: "donus",
      sonuc: "stok-yok",
    });
    expect(odeme.iptal).toBe(true);
    expect(await oturumunSiparisleri(oturum)).toEqual([]);
    expect(await odemeSatiri(belirtec)).toMatchObject({
      durum: "iptal-edildi",
      odeme_kimligi: odeme.odemeKimligi,
    });
    // Sonraki dönüş aynı sonucu verir, ikinci iptal denenmez.
    expect(await servis.tamamla(vt, belirtec, { erisimVer: true })).toMatchObject({
      sonuc: "stok-yok",
    });
  });

  it("fiyat değiştiyse ödeme iptal edilir, müşteri sepet-degisti ile döner", async () => {
    const birim = await birimAc();
    const { oturum, belirtec } = await baslat(birim);
    const odeme = odemeAyarla(belirtec, "basarili");
    await siteninFiyatServisi(site).fiyatYaz(vt, yapan, birim, { satisFiyati: 16_000 });
    expect(await servis.tamamla(vt, belirtec, { erisimVer: true })).toEqual({
      tur: "donus",
      sonuc: "sepet-degisti",
    });
    expect(odeme.iptal).toBe(true);
    expect(await oturumunSiparisleri(oturum)).toEqual([]);
  });

  it("iptal edilemezse ödeme bekler (bilinmiyor), tarama yeniden dener ve iptal eder", async () => {
    const birim = await birimAc(1);
    const { oturum, belirtec } = await baslat(birim);
    const odeme = odemeAyarla(belirtec, "basarili");
    await vt.delete(stokAyirmalari).where(eq(stokAyirmalari.oturum_kimligi, oturum));
    await stokServisi().stokDuzelt(vt, yapan, birim, {
      yeniMiktar: 0,
      gorulenMiktar: 1,
      sebep: "sayim",
    });
    kurulus.ariza.iptalReddi = true;
    try {
      expect(await servis.tamamla(vt, belirtec, { erisimVer: true })).toMatchObject({
        sonuc: "bilinmiyor",
      });
    } finally {
      kurulus.ariza.iptalReddi = false;
    }
    expect((await odemeSatiri(belirtec))?.durum).toBe("baslatildi");
    await vt
      .update(kartOdemeleri)
      .set({ olusturma_zamani: sql`now() - interval '40 minutes'` })
      .where(eq(kartOdemeleri.belirtec, belirtec));
    await servis.bekleyenleriSor(vt);
    expect(odeme.iptal).toBe(true);
    expect((await odemeSatiri(belirtec))?.durum).toBe("iptal-edildi");
  });
});

describe("kuruluşun arızası", () => {
  it("ulaşılamazsa ödeme başlamaz (yontem-ulasilamadi), ayırma bırakılır", async () => {
    const birim = await birimAc(1);
    kurulus.ariza.ulasilamaz = true;
    try {
      const hata = await hatasi(
        odemeServisi(site).onayla(
          vt,
          {
            kim: { tur: "misafir", eposta: "ulasilamaz@ornek.test", hesap: { ac: false } },
            bilgiler: bilgiler(),
            kalemler: [{ birim, adet: 1 }],
          },
          3600,
        ),
      );
      expect(hata).toEqual({
        kod: "is-kurali",
        ayrinti: [{ alan: "bilgiler.odemeYontemi", kod: "yontem-ulasilamadi" }],
      });
    } finally {
      kurulus.ariza.ulasilamaz = false;
    }
    const kalan = await vt.select().from(stokAyirmalari);
    const birimin = (
      await vt.select().from(stokAyirmalari).where(eq(stokAyirmalari.birim_kimligi, birim))
    ).length;
    expect(kalan).toBeDefined();
    expect(birimin).toBe(0);
  });

  it("sonuç sorgusuna ulaşılamazsa ya da imzası tutmazsa sipariş kurulmaz (bilinmiyor)", async () => {
    const birim = await birimAc();
    const { oturum, belirtec } = await baslat(birim);
    odemeAyarla(belirtec, "basarili");
    kurulus.ariza.ulasilamaz = true;
    try {
      expect(await servis.tamamla(vt, belirtec, { erisimVer: true })).toMatchObject({
        sonuc: "bilinmiyor",
      });
    } finally {
      kurulus.ariza.ulasilamaz = false;
    }
    kurulus.ariza.bozukImza = true;
    try {
      expect(await servis.tamamla(vt, belirtec, { erisimVer: true })).toMatchObject({
        sonuc: "bilinmiyor",
      });
    } finally {
      kurulus.ariza.bozukImza = false;
    }
    expect(await oturumunSiparisleri(oturum)).toEqual([]);
    expect((await odemeSatiri(belirtec))?.durum).toBe("baslatildi");
  });
});

describe("kuruluşun sonucu ödemeyle uyuşmuyor", () => {
  it("kuruluş başka tutar ya da başka oturum söylerse sipariş kurulmaz (bilinmiyor)", async () => {
    const birim = await birimAc();
    const { oturum, belirtec } = await baslat(birim);
    const odeme = odemeAyarla(belirtec, "basarili");
    odeme.tutar = "1.00";
    expect(await servis.tamamla(vt, belirtec, { erisimVer: true })).toMatchObject({
      sonuc: "bilinmiyor",
    });
    odeme.tutar = "150.00";
    odeme.oturum = randomUUID();
    expect(await servis.tamamla(vt, belirtec, { erisimVer: true })).toMatchObject({
      sonuc: "bilinmiyor",
    });
    expect(await oturumunSiparisleri(oturum)).toEqual([]);
  });
});

describe("kuruluşun adresi", () => {
  it("deneme ortamında yalnız yerel adrese çevrilir; canlı ortam her zaman kuruluşun kendi adresidir", () => {
    expect(kurulusAdresi("deneme")).toBe(kurulus.adres);
    expect(kurulusAdresi("canli")).toBe("https://api.iyzipay.com");
    for (const adres of [
      "https://kotu.ornek",
      "http://10.0.0.5:3999",
      "http://localhost.kotu.ornek",
    ]) {
      vi.stubEnv("KARTLA_ODEME_DENEME_ADRESI", adres);
      expect(kurulusAdresi("deneme"), adres).toBe("https://sandbox-api.iyzipay.com");
    }
    vi.stubEnv("KARTLA_ODEME_DENEME_ADRESI", kurulus.adres);
  });
});

describe("kapının dış kuruluş dönüşü", () => {
  it("yalnız bildirim sınırıyla tanımlanır; yönlendirme yalnız sitenin kendi yoluna", () => {
    // Aynı tanım bildirim sınırıyla kurulur: hata tanımın kendisinden değil, sınırdan gelir.
    expect(() =>
      ucTanimla({
        giris: "herkese-acik",
        temaDemosunda: "kapali",
        disKurulus: true,
        sema: donusSemasi,
        izin: "herkese-acik",
        sinir: "bildirim",
        isle: async () => ({}),
      }),
    ).not.toThrow();
    expect(() =>
      ucTanimla({
        giris: "herkese-acik",
        temaDemosunda: "kapali",
        disKurulus: true,
        sema: donusSemasi,
        izin: "herkese-acik",
        sinir: "genel",
        isle: async () => ({}),
      }),
    ).toThrow();
    for (const yol of ["https://kotu.ornek", "//kotu.ornek", "/\\kotu.ornek", "odeme"]) {
      expect(() => new Yonlendirme(yol), yol).toThrow();
    }
    expect(new Yonlendirme("/odeme?kart=reddedildi").yol).toBe("/odeme?kart=reddedildi");
  });

  it("dış kuruluş olmayan uç başka siteden gelen isteği yine reddeder", async () => {
    const yanit = await kartlaOdemeTaksitlerUcu(
      new Request("http://yerel/kapi/herkese-acik/kartla-odeme/taksitler", {
        method: "POST",
        headers: { "sec-fetch-site": "cross-site", "content-type": "application/json" },
        body: "{}",
      }),
    );
    expect(yanit.status).toBe(403);
  });
});

describe("günlük karşılaştırma", () => {
  it("kuruluşta ödendi ama sitede sipariş yok, sitede ödendi ama kuruluşta yok, tutar farklı", async () => {
    const birim = await birimAc(10);
    const tamam = await baslat(birim);
    odemeAyarla(tamam.belirtec, "basarili");
    await servis.tamamla(vt, tamam.belirtec, { erisimVer: false });
    const gun =
      (
        await vt.execute<{ gun: string }>(
          sql`select to_char(now() at time zone ${site.ayarlar.saatDilimi}, 'YYYY-MM-DD') as gun`,
        )
      ).rows[0]?.gun ?? "";
    // Bu testin ödemeleri dışında kalanlar da karşılaştırılır: yalnız bu testin uyuşmazlıklarına bakılır.
    const buTestin = (liste: Awaited<ReturnType<typeof servis.karsilastir>>) =>
      (liste ?? []).filter((satir) => [tamam.oturum, "yabanci"].includes(satir.oturum ?? ""));
    expect(buTestin(await servis.karsilastir(vt, gun))).toEqual([]);

    kurulus.ekRapor.push({
      transactionType: "PAYMENT",
      paymentId: 42,
      conversationId: "yabanci",
      paidPrice: 10,
      transactionStatus: 1,
    });
    await vt
      .update(kartOdemeleri)
      .set({ odenen: 99_999 })
      .where(eq(kartOdemeleri.belirtec, tamam.belirtec));
    try {
      expect(buTestin(await servis.karsilastir(vt, gun))).toEqual(
        expect.arrayContaining([
          { tur: "siparis-yok", odemeKimligi: "42", oturum: "yabanci" },
          { tur: "tutar-farkli", odemeKimligi: expect.any(String), oturum: tamam.oturum },
        ]),
      );
      // Kuruluşun kaydında olmayan ödendi satırı.
      kurulus.odemeler.delete(tamam.belirtec);
      expect(buTestin(await servis.karsilastir(vt, gun))).toContainEqual({
        tur: "odeme-yok",
        odemeKimligi: expect.any(String),
        oturum: tamam.oturum,
      });
      // Yöneticiye bildirim (kart 0241): ortam ve gün başına bir kez, üç karşılaştırmada da.
      expect(
        await yoneticiBildirimleri(
          `kartla-odeme-karsilastirma:${site.ayarlar.kartlaOdemeOrtami}:${gun}`,
        ),
      ).toEqual([
        {
          bildirim: "kartla-odeme-uyusmazligi",
          anahtar: `kartla-odeme-karsilastirma:${site.ayarlar.kartlaOdemeOrtami}:${gun}`,
          veri: { gun, sayi: expect.any(Number) },
        },
      ]);
    } finally {
      kurulus.ekRapor.splice(0);
    }
  });

  it("gün sınırında başlayıp ertesi gün ödenen ödeme önceki günde uyuşmazlık sayılmaz", async () => {
    const birim = await birimAc();
    const { oturum, belirtec } = await baslat(birim);
    odemeAyarla(belirtec, "basarili");
    await servis.tamamla(vt, belirtec, { erisimVer: false });
    await vt
      .update(kartOdemeleri)
      .set({ olusturma_zamani: sql`now() - interval '1 day'` })
      .where(eq(kartOdemeleri.belirtec, belirtec));
    const dun =
      (
        await vt.execute<{ gun: string }>(
          sql`select to_char((now() - interval '1 day') at time zone ${site.ayarlar.saatDilimi}, 'YYYY-MM-DD') as gun`,
        )
      ).rows[0]?.gun ?? "";
    expect((await servis.karsilastir(vt, dun))?.filter((satir) => satir.oturum === oturum)).toEqual(
      [],
    );
  });

  it("eklenti kapalı ve son günlerde ödeme yoksa karşılaştırma yapılmaz", async () => {
    expect(await kartlaOdemeServisi(kapali).karsilastir(vtB, "2026-01-01")).toBeUndefined();
  });
});

describe("taksit tablosu", () => {
  it("bankalara göre, en çok taksite kadar ve sitenin biçimiyle; ayar gösterme ya da eklenti kapalıysa yok", async () => {
    const birim = await birimAc();
    const tablo = await servis.taksitTablosu(vt, birim);
    expect(tablo.enCok).toBe(6);
    expect(tablo.bankalar[0]?.taksitler.map((taksit) => taksit.sayi)).toEqual([1, 2, 3, 6]);
    expect(tablo.bankalar[0]?.taksitler[0]?.toplam).toMatch(/150,00/);
    expect((await hatasi(kartlaOdemeServisi(kapali).taksitTablosu(vt, birim))).kod).toBe(
      "bulunamadi",
    );
    await siteninServisi(site).degistir(vt, yapan, { kartlaOdemeUrunSayfasindaTaksit: false });
    try {
      expect((await hatasi(servis.taksitTablosu(vt, birim))).kod).toBe("bulunamadi");
    } finally {
      await siteninServisi(site).degistir(vt, yapan, { kartlaOdemeUrunSayfasindaTaksit: true });
    }
    kurulus.ariza.taksitReddi = true;
    try {
      expect((await hatasi(servis.taksitTablosu(vt, birim))).kod).toBe("hizmet-kullanilamiyor");
    } finally {
      kurulus.ariza.taksitReddi = false;
    }
  });
});

describe("veritabanı ve iki site", () => {
  it("durum denetimi kayıtla aynı; bir sitenin belirteci öteki sitede bulunmaz", async () => {
    const kosul = (
      await vt.execute<{ tanim: string }>(
        sql`select pg_get_constraintdef(oid) as tanim from pg_constraint where conname = 'kart_odemeleri_durum'`,
      )
    ).rows[0]?.tanim;
    for (const durum of kartOdemesiDurumlari) expect(kosul).toContain(`'${durum}'`);
    expect(kosul?.match(/'[a-z-]+'/g)).toHaveLength(kartOdemesiDurumlari.length);

    const birim = await birimAc();
    const { belirtec } = await baslat(birim);
    odemeAyarla(belirtec, "basarili");
    expect(await kartlaOdemeServisi(site).tamamla(vtB, belirtec, { erisimVer: true })).toEqual({
      tur: "donus",
      sonuc: "yarida-kaldi",
    });
    expect(await odemeSatiri(belirtec, vtB)).toBeUndefined();
  });
});

// İptal ve iade (kart 0235, karar 0147): para kalem kalem kuruluştan döner, aynı parça bir kez gider; ret ve belirsiz
// yanıtta sipariş iade edilmiş sayılmaz, tarama günlük rapordan sorar.
describe("kartla ödenen siparişin iptali ve iadesi", () => {
  const iade = iadeServisi(site);
  const yonetim = siparisYonetimi(site);
  const yonetici = { tur: "yonetici" as const, kimlik: randomUUID() };
  const iptalGirdisi = (numara: string) => ({
    numara,
    tur: "iptal" as const,
    gorulenDurum: "hazirlaniyor" as const,
    kalemler: [],
    kargo: false,
    stogaKoy: true,
    neden: "musteri-vazgecti" as const,
  });

  // İki ürünlü, ödenmiş kart siparişi (taksitle: ödenen tutar taksit farkını taşır).
  const odenmisSiparis = async (taksit = 1) => {
    const a = await birimAc();
    const b = await birimAc();
    const sonuc = await odemeServisi(site).onayla(
      vt,
      {
        kim: { tur: "misafir", eposta: "iade@ornek.test", hesap: { ac: false } },
        bilgiler: bilgiler(),
        kalemler: [
          { birim: a, adet: 2 },
          { birim: b, adet: 1 },
        ],
        ip: "203.0.113.5",
      },
      3600,
    );
    if (sonuc.tur !== "yonlendir") throw new Error("Kartla ödeme yönlendirmeliydi.");
    const [odeme] = await vt
      .select()
      .from(kartOdemeleri)
      .where(eq(kartOdemeleri.oturum_kimligi, sonuc.oturum));
    if (odeme === undefined) throw new Error("Kart ödemesi yok.");
    odemeAyarla(odeme.belirtec, "basarili", taksit);
    await servis.tamamla(vt, odeme.belirtec, { erisimVer: false });
    const [siparis] = await oturumunSiparisleri(sonuc.oturum);
    if (siparis === undefined) throw new Error("Sipariş kurulmadı.");
    const kurulustaki = kurulus.odemeler.get(odeme.belirtec);
    if (kurulustaki === undefined) throw new Error("Kuruluşta ödeme yok.");
    return { siparis, a, b, kurulustaki };
  };
  const teslimEt = async (numara: string) => {
    await yonetim.islemYap(vt, yonetici, {
      numara,
      islem: "kargoya-ver",
      gorulenDurum: "hazirlaniyor",
      kargo: { firma: kargoFirmasi },
    });
    await yonetim.islemYap(vt, yonetici, {
      numara,
      islem: "teslim-edildi",
      gorulenDurum: "kargoda",
    });
  };
  const iadeler = (siparis: string) =>
    vt.select().from(siparisIadeleri).where(eq(siparisIadeleri.siparis_kimligi, siparis));
  const parcalar = (iadeKimligi: string) =>
    vt.select().from(kartIadeleri).where(eq(kartIadeleri.iade_kimligi, iadeKimligi));
  const durumu = async (kimlik: string) =>
    (
      await vt
        .select({ durum: siparisler.durum })
        .from(siparisler)
        .where(eq(siparisler.kimlik, kimlik))
    )[0]?.durum;
  const iadeSayisi = () =>
    (kurulus.istekSayisi.get("/payment/refund") ?? 0) +
    (kurulus.istekSayisi.get("/v2/payment/refund") ?? 0);
  const arizayiKaldir = () => {
    kurulus.ariza.iadeReddi = false;
    kurulus.ariza.iadeYanitsiz = false;
    kurulus.ariza.reddedilenKalem = null;
    kurulus.ariza.ulasilamaz = false;
  };

  it("sonuç kalemlerin işlemleriyle saklanır; taksitli siparişin iptali ödenen tutarın tamamını kalem kalem döndürür", async () => {
    const { siparis, kurulustaki } = await odenmisSiparis(3);
    const [odeme] = await vt
      .select()
      .from(kartOdemeleri)
      .where(eq(kartOdemeleri.siparis_kimligi, siparis.kimlik));
    expect(odeme?.kalem_islemleri?.map((kalem) => kalem.islem).sort()).toEqual(
      kurulustaki.kalemler.map((kalem) => kalem.islem).sort(),
    );
    expect(odeme?.kalem_islemleri?.reduce((t, kalem) => t + kalem.odenen, 0)).toBe(odeme?.odenen);
    const once = iadeSayisi();
    expect(await iade.iadeYap(vt, yonetici, iptalGirdisi(siparis.numara))).toEqual({
      numara: siparis.numara,
      durum: "iptal",
      iade: "tamamlandi",
    });
    const [kayit] = await iadeler(siparis.kimlik);
    // Taksit farkı dahil (kullanıcı kararı).
    expect(odeme?.odenen).toBeGreaterThan(siparis.toplam);
    expect(kayit).toMatchObject({
      tur: "iptal",
      durum: "tamamlandi",
      yontem: "kurulus",
      tutar: odeme?.odenen,
    });
    const giden = await parcalar(kayit?.kimlik ?? "");
    expect(giden.every((parca) => parca.durum === "tamam")).toBe(true);
    expect(giden.reduce((t, parca) => t + parca.tutar, 0)).toBe(odeme?.odenen);
    expect(kurulustaki.iadeler.map((satir) => satir.parca).sort()).toEqual(
      giden.map((parca) => parca.kimlik).sort(),
    );
    expect(iadeSayisi() - once).toBe(giden.length);
    expect(kurulustaki.iptal).toBe(false);
  });

  it("kısmi iade yalnız seçilen kalemden döner; aynı iadenin ikinci çağrısı kuruluşa gitmez", async () => {
    const { siparis, a, kurulustaki } = await odenmisSiparis();
    await teslimEt(siparis.numara);
    const kalemler = await vt
      .select()
      .from(siparisKalemleri)
      .where(eq(siparisKalemleri.siparis_kimligi, siparis.kimlik));
    const kalemA = kalemler.find((kalem) => kalem.birim_kimligi === a);
    expect(
      await iade.iadeYap(vt, yonetici, {
        numara: siparis.numara,
        tur: "iade",
        gorulenDurum: "teslim-edildi",
        kalemler: [{ sira: kalemA?.sira ?? 0, adet: 1 }],
        kargo: false,
        stogaKoy: false,
        neden: "beklentiyi-karsilamadi",
      }),
    ).toEqual({ numara: siparis.numara, durum: "kismi-iade", iade: "tamamlandi" });
    const [kayit] = await iadeler(siparis.kimlik);
    const islemA = kurulustaki.kalemler.find((kalem) => kalem.id === a)?.islem;
    expect(kurulustaki.iadeler).toEqual([
      expect.objectContaining({ islem: islemA, tutar: kayit?.tutar }),
    ]);
    const once = iadeSayisi();
    expect(
      await kartlaIadeEt(vt, site, {
        iade: kayit?.kimlik ?? "",
        siparis: siparis.kimlik,
        tutar: kayit?.tutar ?? 0,
        kalemler: [{ birim: a, tutar: kayit?.tutar ?? 0 }],
        kargoTutari: 0,
      }),
    ).toBe("tamam");
    expect(iadeSayisi()).toBe(once);
    expect(kurulustaki.iadeler).toHaveLength(1);
  });

  it("aynı anda iki çağrıda her parça kuruluşa bir kez gider", async () => {
    const { siparis, a, b, kurulustaki } = await odenmisSiparis();
    const [satir] = await vt
      .insert(siparisIadeleri)
      .values({
        siparis_kimligi: siparis.kimlik,
        tur: "iptal",
        durum: "bekliyor",
        yontem: "kurulus",
        tutar: siparis.toplam,
        vergi_dokumu: [],
        kalemler: [],
        kargo_tutari: 0,
        stoga_konacak: true,
        neden: "diger",
        kim_turu: "sistem",
        kim_adi: "test",
      })
      .returning();
    const istek = {
      iade: satir?.kimlik ?? "",
      siparis: siparis.kimlik,
      tutar: siparis.toplam,
      kalemler: [
        { birim: a, tutar: 1 },
        { birim: b, tutar: 1 },
      ],
      kargoTutari: 0,
    };
    const sonuclar = await Promise.all([
      kartlaIadeEt(vt, site, istek),
      kartlaIadeEt(vt, site, istek),
      kartlaIadeEt(vt, site, istek),
    ]);
    expect(sonuclar).toContain("tamam");
    const giden = await parcalar(satir?.kimlik ?? "");
    expect(kurulustaki.iadeler).toHaveLength(giden.length);
    expect(kurulustaki.iadeler.reduce((t, satir_) => t + satir_.tutar, 0)).toBe(siparis.toplam);
  });

  it("kuruluş reddederse iade başarısızdır, sipariş değişmez, yeni iade yapılabilir", async () => {
    const { siparis, kurulustaki } = await odenmisSiparis();
    kurulus.ariza.iadeReddi = true;
    try {
      expect(await iade.iadeYap(vt, yonetici, iptalGirdisi(siparis.numara))).toEqual({
        numara: siparis.numara,
        durum: "hazirlaniyor",
        iade: "basarisiz",
      });
    } finally {
      arizayiKaldir();
    }
    expect(await durumu(siparis.kimlik)).toBe("hazirlaniyor");
    const [kayit] = await iadeler(siparis.kimlik);
    expect(kayit?.durum).toBe("basarisiz");
    expect((await parcalar(kayit?.kimlik ?? "")).every((parca) => parca.durum === "red")).toBe(
      true,
    );
    expect(kurulustaki.iadeler).toEqual([]);
    // Ret para döndürmedi: aynı iptal yeniden yapılır.
    expect((await iade.iadeYap(vt, yonetici, iptalGirdisi(siparis.numara))).iade).toBe(
      "tamamlandi",
    );
  });

  it("yanıt gelmezse iade bekler, sipariş değişmez; tarama günlük rapordan bulup bir kez tamamlar", async () => {
    const { siparis } = await odenmisSiparis();
    kurulus.ariza.iadeYanitsiz = true;
    let sonuc: Awaited<ReturnType<typeof iade.iadeYap>>;
    try {
      sonuc = await iade.iadeYap(vt, yonetici, iptalGirdisi(siparis.numara));
    } finally {
      arizayiKaldir();
    }
    expect(sonuc).toEqual({ numara: siparis.numara, durum: "hazirlaniyor", iade: "bekliyor" });
    const [kayit] = await iadeler(siparis.kimlik);
    expect((await parcalar(kayit?.kimlik ?? "")).every((parca) => parca.durum === "belirsiz")).toBe(
      true,
    );
    expect(
      await hatasi(
        yonetim.islemYap(vt, yonetici, {
          numara: siparis.numara,
          islem: "kargoya-ver",
          gorulenDurum: "hazirlaniyor",
          kargo: { firma: kargoFirmasi },
        }),
      ),
    ).toMatchObject({ kod: "cakisma", ayrinti: [{ kod: "iade-bekliyor" }] });
    // Yeniden deneme belirsiz parçayı göndermez.
    const once = iadeSayisi();
    expect((await iade.yenidenDene(vt, yonetici, siparis.numara)).iade).toBe("bekliyor");
    expect(iadeSayisi()).toBe(once);
    // Tarama yalnız sorma süresi geçmiş parçayı sorar.
    expect(await belirsizIadeleriSor(vt, site)).toBe(0);
    await vt
      .update(kartIadeleri)
      .set({ son_sorgu_zamani: sql`now() - interval '1 hour'` })
      .where(eq(kartIadeleri.iade_kimligi, kayit?.kimlik ?? ""));
    expect(await belirsizIadeleriSor(vt, site)).toBeGreaterThan(0);
    expect(await durumu(siparis.kimlik)).toBe("iptal");
    expect((await iadeler(siparis.kimlik))[0]?.durum).toBe("tamamlandi");
    expect(iadeSayisi()).toBe(once);
    expect(await belirsizIadeleriSor(vt, site)).toBe(0);
  });

  it("bir kalem reddedilince iade bekler, yeniden deneme yalnız onu gönderir", async () => {
    const { siparis, b, kurulustaki } = await odenmisSiparis();
    kurulus.ariza.reddedilenKalem = b;
    try {
      expect((await iade.iadeYap(vt, yonetici, iptalGirdisi(siparis.numara))).iade).toBe(
        "bekliyor",
      );
    } finally {
      arizayiKaldir();
    }
    const [kayit] = await iadeler(siparis.kimlik);
    const ilk = await parcalar(kayit?.kimlik ?? "");
    expect(ilk.filter((parca) => parca.durum === "red").map((parca) => parca.kalem)).toEqual([b]);
    // Kuruluş hemen kısmen reddetti: tarama beklenmeden yöneticiye bildirilir (kart 0241, bağımsız kontrolün bulgusu).
    expect(await yoneticiBildirimleri(`kartla-iade-kismi-red:${kayit?.kimlik}`)).toEqual([
      {
        bildirim: "bekleyen-iade",
        anahtar: `kartla-iade-kismi-red:${kayit?.kimlik}`,
        veri: { numara: siparis.numara, neden: "kismi-red" },
      },
    ]);
    expect(await durumu(siparis.kimlik)).toBe("hazirlaniyor");
    const donen = kurulustaki.iadeler.length;
    expect((await iade.yenidenDene(vt, yonetici, siparis.numara)).iade).toBe("tamamlandi");
    expect(kurulustaki.iadeler.length).toBe(donen + 1);
    expect(await durumu(siparis.kimlik)).toBe("iptal");
    expect(await hatasi(iade.yenidenDene(vt, yonetici, siparis.numara))).toMatchObject({
      kod: "cakisma",
    });
  });

  // Kart 0241: iadenin bir kısmı dönüp bir kısmı reddedilince tarama yöneticiye bir kez bildirir.
  it("taramada bir kısmı dönen, bir kısmı reddedilen iade yöneticiye bir kez bildirilir", async () => {
    const { siparis, b } = await odenmisSiparis();
    kurulus.ariza.reddedilenKalem = b;
    try {
      await iade.iadeYap(vt, yonetici, iptalGirdisi(siparis.numara));
    } finally {
      arizayiKaldir();
    }
    const [kayit] = await iadeler(siparis.kimlik);
    // Dönen parça yanıtı gelmemiş gibi yeniden belirsiz yapılır: tarama onu raporda bulur, reddedilen yanında kalır.
    await vt
      .update(kartIadeleri)
      .set({ durum: "belirsiz", son_sorgu_zamani: sql`now() - interval '1 hour'` })
      .where(
        and(eq(kartIadeleri.iade_kimligi, kayit?.kimlik ?? ""), eq(kartIadeleri.durum, "tamam")),
      );
    await belirsizIadeleriSor(vt, site);
    await belirsizIadeleriSor(vt, site);
    expect((await iadeler(siparis.kimlik))[0]?.durum).toBe("bekliyor");
    expect(await yoneticiBildirimleri(`kartla-iade-kismi-red:${kayit?.kimlik}`)).toEqual([
      {
        bildirim: "bekleyen-iade",
        anahtar: `kartla-iade-kismi-red:${kayit?.kimlik}`,
        veri: { numara: siparis.numara, neden: "kismi-red" },
      },
    ]);
  });

  it("kuruluşa hiç ulaşmayan parça raporda bulunmaz: süresi geçince red sayılmaz, hatası yazılır, iade bekler; sorma süresinden eskisi sorulmaz", async () => {
    const { siparis } = await odenmisSiparis();
    kurulus.ariza.ulasilamaz = true;
    try {
      expect((await iade.iadeYap(vt, yonetici, iptalGirdisi(siparis.numara))).iade).toBe(
        "bekliyor",
      );
    } finally {
      arizayiKaldir();
    }
    const [bekleyen] = await iadeler(siparis.kimlik);
    await vt
      .update(kartIadeleri)
      .set({
        son_sorgu_zamani: sql`now() - interval '1 hour'`,
        olusturma_zamani: sql`now() - interval '3 days'`,
      })
      .where(eq(kartIadeleri.iade_kimligi, bekleyen?.kimlik ?? ""));
    await belirsizIadeleriSor(vt, site);
    expect(await parcalar(bekleyen?.kimlik ?? "")).toEqual(
      expect.arrayContaining([expect.objectContaining({ durum: "belirsiz", hata: "raporda-yok" })]),
    );
    expect(
      (await parcalar(bekleyen?.kimlik ?? "")).every((parca) => parca.durum === "belirsiz"),
    ).toBe(true);
    expect((await iadeler(siparis.kimlik))[0]?.durum).toBe("bekliyor");
    expect(await durumu(siparis.kimlik)).toBe("hazirlaniyor");
    // Yöneticiye bildirim (kart 0241): iade başına bir kez, tarama yeniden çalışsa da.
    await vt
      .update(kartIadeleri)
      .set({ son_sorgu_zamani: sql`now() - interval '1 hour'` })
      .where(eq(kartIadeleri.iade_kimligi, bekleyen?.kimlik ?? ""));
    await belirsizIadeleriSor(vt, site);
    expect(await yoneticiBildirimleri(`kartla-iade-raporda-yok:${bekleyen?.kimlik}`)).toEqual([
      {
        bildirim: "bekleyen-iade",
        anahtar: `kartla-iade-raporda-yok:${bekleyen?.kimlik}`,
        veri: { numara: siparis.numara, neden: "raporda-yok" },
      },
    ]);
    // Yeniden deneme belirsiz parçayı göndermez.
    const once = iadeSayisi();
    expect((await iade.yenidenDene(vt, yonetici, siparis.numara)).iade).toBe("bekliyor");
    expect(iadeSayisi()).toBe(once);
    // Sorma süresinden eski parça sorulmaz.
    await vt
      .update(kartIadeleri)
      .set({
        son_sorgu_zamani: sql`now() - interval '1 hour'`,
        olusturma_zamani: sql`now() - interval '8 days'`,
      })
      .where(eq(kartIadeleri.iade_kimligi, bekleyen?.kimlik ?? ""));
    const sorgular = kurulus.istekSayisi.get("/v2/reporting/payment/transactions") ?? 0;
    await belirsizIadeleriSor(vt, site);
    expect(kurulus.istekSayisi.get("/v2/reporting/payment/transactions") ?? 0).toBe(sorgular);
  });

  it("kalem işlemi bilinmeyen eski ödemenin iadesi ödemenin kimliğiyle tek parça gider", async () => {
    const { siparis, kurulustaki } = await odenmisSiparis();
    await vt
      .update(kartOdemeleri)
      .set({ kalem_islemleri: null })
      .where(eq(kartOdemeleri.siparis_kimligi, siparis.kimlik));
    await iade.iadeYap(vt, yonetici, iptalGirdisi(siparis.numara));
    const [kayit] = await iadeler(siparis.kimlik);
    expect(await parcalar(kayit?.kimlik ?? "")).toMatchObject([
      { kalem: "tumu", islem: null, durum: "tamam" },
    ]);
    expect(kurulustaki.iadeler).toEqual([
      expect.objectContaining({ islem: null, tutar: kayit?.tutar }),
    ]);
  });

  it("dağıtım: istenen kalemlere kalanları kadar, fark kalanı olan kalemlere, sığmazsa yok", () => {
    const kalanlar = [
      { kalem: "a", kalan: 1000 },
      { kalem: "b", kalan: 500 },
      { kalem: "kargo", kalan: 300 },
    ];
    expect(
      iadeyiDagit(
        { tutar: 1200, kalemler: [{ birim: "a", tutar: 1000 }], kargoTutari: 0 },
        kalanlar,
      ),
    ).toEqual([
      { kalem: "a", tutar: 1000 },
      { kalem: "b", tutar: 200 },
    ]);
    expect(iadeyiDagit({ tutar: 1800, kalemler: [], kargoTutari: 300 }, kalanlar)).toEqual([
      { kalem: "kargo", tutar: 300 },
      { kalem: "a", tutar: 1000 },
      { kalem: "b", tutar: 500 },
    ]);
    expect(iadeyiDagit({ tutar: 1801, kalemler: [], kargoTutari: 0 }, kalanlar)).toBeUndefined();
  });
});
