// Sipariş fişinin verisi gerçek veritabanıyla (kart 0270, karar 0171): mağazanın üst bilgisi ve vergi bilgileri
// ayarlardan; siparişin numarası, ödemesi, teslimatı, faturası, kalemleri ve müşterinin notu; kalemler ve tutarlar
// ayrıntıdakiyle aynı; ayar kapalıyken tutar hiç yok, ürün ve kalem sayısı var; birden çok sipariş verilen sırayla,
// tekrar ve olmayan numara olmadan; kişisel bilgisi silinmiş sipariş fişe girmeyip "atlanan"da; fiş ayarının kaydı ve
// değişiklik kaydı, aynı değerin kayda girmemesi.
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { and, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { type Site, siteKlasorunuOku } from "../../ayar-semasi/site-klasoru.ts";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri.ts";
import { siparisSinirlari } from "../../kayitlar/siparis.ts";
import { siteninBicimleyicisi } from "../../metinler/site-metni.ts";
import { degisiklikKayitlari } from "../../moduller/degisiklik-kaydi/model.ts";
import { siteninFiyatServisi } from "../../moduller/fiyat/servis.ts";
import { kuponServisi } from "../../moduller/kampanya/servis.ts";
import { odemeBilgileriSemasi } from "../../moduller/odeme/semalar.ts";
import { odemeServisi } from "../../moduller/odeme/servis.ts";
import { siparisAyarlari } from "../../moduller/siparis/ayarlar.ts";
import { siparisler } from "../../moduller/siparis/model.ts";
import { stokServisi } from "../../moduller/stok/servis.ts";
import { urunServisi } from "../../moduller/urun/servis.ts";
import { siteninVergiServisi } from "../../moduller/vergi/servis.ts";
import { baglantiyiKapat, siteninVeritabani, type Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import { fisNumaralariniOku, siparisFisleriVerisi } from "../siparisler/fis-verisi.ts";
import { siparisAyrintisiVerisi } from "../siparisler/veri.ts";

vi.setConfig({ testTimeout: 90_000 });

const siteAnahtari = Symbol.for("cekirdek.calisanSite");
const ortak = globalThis as Record<symbol, unknown>;
const klasor = siteKlasorunuOku(
  resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler/vergi-dolu"),
);
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
    iletisimTelefonu: "+90 312 000 00 00",
    iletisimEpostasi: "iletisim@ornek.test",
    saticiBilgileri: {
      ulke: "TR",
      isletmeTuru: "sirket",
      unvan: "Deneme Ticaret A.Ş.",
      vergiDairesi: "Kavaklıdere",
      vergiNumarasi: "4540536920",
      mersisNumarasi: "0123456789000015",
    },
    odemeYontemleri: [
      { kod: "havale", acik: false },
      { kod: "kapida-odeme", acik: true },
    ],
    kapidaOdemeSecenekleri: ["nakit"],
  },
};
const kim = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

let vt: Veritabani;
let sil: () => Promise<void>;
let birimler: string[] = [];

beforeAll(async () => {
  const deneme = await denemeSitesiAc("siparis-fisi");
  sil = deneme.sil;
  vi.stubEnv("VERITABANI_ADRESI", deneme.baglantiAdresi);
  await baglantiyiKapat();
  ortak[siteAnahtari] = site;
  vt = siteninVeritabani();
  const genel = (await siteninVergiServisi(site).tabloyuOku(vt)).find(
    (sinif) => sinif.ad === "Genel",
  )?.kimlik;
  if (genel === undefined) throw new Error("Genel sınıf yok.");
  const urunSrv = urunServisi(() => site.ayarlar.saatDilimi);
  birimler = [];
  for (const [ad, stokKodu] of [
    ["Fiş kalemi bir", "FIS-001"],
    ["Fiş kalemi iki", "FIS-002"],
  ] as const) {
    const urun = await urunSrv.urunEkle(vt, kim(), {
      ad: `${ad} ${randomUUID().slice(0, 6)}`,
      vergiSinifi: genel,
      durum: "yayinda",
      stokTakibi: true,
      stokKodu,
    });
    const birim = (await urunSrv.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
    await siteninFiyatServisi(site).fiyatYaz(vt, kim(), birim, { satisFiyati: 12_345 });
    await stokServisi().stokDuzelt(vt, kim(), birim, {
      yeniMiktar: 100,
      gorulenMiktar: 0,
      sebep: "sayim",
    });
    birimler.push(birim);
  }
});

afterAll(async () => {
  delete ortak[siteAnahtari];
  await baglantiyiKapat();
  vi.unstubAllEnvs();
  await sil();
});

const ver = async (
  not: string | undefined,
  kalemler: { birim: string; adet: number }[],
  kupon?: string,
) => {
  const sonuc = await odemeServisi(site).siparisVer(
    vt,
    {
      kim: { tur: "misafir", eposta: "fis@ornek.test", hesap: { ac: false } },
      bilgiler: odemeBilgileriSemasi.parse({
        odemeYontemi: { yontem: "kapida-odeme", secenek: "nakit" },
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
        ...(not === undefined ? {} : { not }),
        onBilgilendirmeOnayi: true,
        mesafeliSatisOnayi: true,
        pazarlamaIzni: false,
      }),
      kalemler,
      kupon,
    },
    3600,
  );
  return sonuc.siparis.numara;
};

const fisAyari = (fisteFiyatlar: boolean) =>
  siparisAyarlari(site).fisAyarlariniKaydet(vt, kim(), { fisteFiyatlar });

describe("sipariş fişinin verisi", () => {
  it("mağazanın bilgileri, siparişin bilgileri ve ayrıntıdakiyle aynı kalemler ve tutarlar", async () => {
    await fisAyari(true);
    const numara = await ver("Zil çalışmıyor", [
      { birim: birimler[0] ?? "", adet: 2 },
      { birim: birimler[1] ?? "", adet: 1 },
    ]);
    const veri = await siparisFisleriVerisi([numara]);
    expect(veri.magaza).toMatchObject({
      unvan: "Deneme Ticaret A.Ş.",
      telefon: "+90 312 000 00 00",
      eposta: "iletisim@ornek.test",
      vergiDairesi: "Kavaklıdere",
      vergiNumarasi: "4540536920",
      mersisNumarasi: "0123456789000015",
    });
    expect(veri.magaza.adres).toContain("Deneme Sokak No: 1");
    expect(veri.atlanan).toEqual([]);
    const [fis] = veri.fisler;
    const ayrinti = await siparisAyrintisiVerisi(numara, () => true);
    expect(fis).toMatchObject({
      numara,
      odeme: { yontem: "kapida-odeme", secenek: "nakit" },
      teslimat: { ad: "Deniz Yılmaz", telefon: expect.stringContaining("555") },
      kargo: null,
      fatura: { tur: "bireysel", adresAyni: true },
      kalemSayisi: 2,
      urunSayisi: 3,
      not: "Zil çalışmıyor",
    });
    expect(fis?.teslimat.satirlar.join(" ")).toContain("Atatürk Bulvarı No: 10");
    expect(fis?.kalemler).toEqual(ayrinti?.kalemler);
    expect(fis?.kalemler.map((kalem) => kalem.stokKodu)).toEqual(["FIS-001", "FIS-002"]);
    expect(fis?.tutarlar).toEqual(ayrinti?.tutarlar);
    expect(fis?.zaman).toBe(ayrinti?.ust.zaman);
  });

  it("kuponlu siparişte kupon satırı ve kalemlerin payı ayrıntıdakiyle ve siparişin kaydıyla aynı (kart 0312)", async () => {
    await fisAyari(true);
    await vt.transaction((islem) =>
      kuponServisi(site).ekle(islem, kim(), {
        kod: "FIS5",
        tur: "tutar",
        deger: 500,
        kapsam: "hepsi",
      }),
    );
    const numara = await ver(undefined, [{ birim: birimler[0] ?? "", adet: 1 }], "FIS5");
    const [fis] = (await siparisFisleriVerisi([numara])).fisler;
    const ayrinti = await siparisAyrintisiVerisi(numara, () => true);
    const bicim = siteninBicimleyicisi(site.ayarlar);
    expect(fis?.tutarlar?.kupon).toEqual({
      kod: "FIS5",
      ucretsizKargo: false,
      indirim: bicim.para(500),
    });
    expect(fis?.kalemler[0]?.kuponPayi).toBe(bicim.para(500));
    expect(fis?.tutarlar).toEqual(ayrinti?.tutarlar);
    expect(fis?.kalemler).toEqual(ayrinti?.kalemler);
  });

  it("ayar kapalıyken tutar yok; ürün ve kalem sayısı var", async () => {
    const numara = await ver(undefined, [{ birim: birimler[0] ?? "", adet: 4 }]);
    await fisAyari(false);
    try {
      const [fis] = (await siparisFisleriVerisi([numara])).fisler;
      expect(fis?.tutarlar).toBeNull();
      expect(fis).toMatchObject({ kalemSayisi: 1, urunSayisi: 4, not: null });
      // Kalemin birim fiyatı ve tutarı da yok (bağımsız kontrolün bulgusu).
      expect(fis?.kalemler[0]).not.toHaveProperty("birim");
      expect(fis?.kalemler[0]).not.toHaveProperty("tutar");
      expect(fis?.kalemler[0]).toMatchObject({ adet: 4, stokKodu: "FIS-001" });
    } finally {
      await fisAyari(true);
    }
  });

  it("birden çok sipariş verilen sırayla; olmayan numara yok; kişisel bilgisi silinmiş sipariş atlanır", async () => {
    const bir = await ver(undefined, [{ birim: birimler[0] ?? "", adet: 1 }]);
    const iki = await ver(undefined, [{ birim: birimler[1] ?? "", adet: 1 }]);
    const silinmis = await ver(undefined, [{ birim: birimler[1] ?? "", adet: 1 }]);
    await vt
      .update(siparisler)
      .set({ kisisel_veri_silinme_zamani: new Date() })
      .where(eq(siparisler.numara, silinmis));
    const veri = await siparisFisleriVerisi([iki, "ORN-999999999", silinmis, bir]);
    expect(veri.fisler.map((fis) => fis.numara)).toEqual([iki, bir]);
    expect(veri.atlanan).toEqual([silinmis]);
    expect(await siparisFisleriVerisi([])).toMatchObject({ fisler: [], atlanan: [] });
  });
});

describe("fiş ayarı", () => {
  it("kaydedilir, değişiklik kaydına girer; aynı değer girmez", async () => {
    const kayitlar = async () =>
      (
        await vt
          .select({ eski: degisiklikKayitlari.eski_deger, yeni: degisiklikKayitlari.yeni_deger })
          .from(degisiklikKayitlari)
          .where(
            and(
              eq(degisiklikKayitlari.islem, "magaza-ayari.degisti"),
              sql`${degisiklikKayitlari.yeni_deger}->>'ayar' = 'fisteFiyatlar'`,
            ),
          )
      ).length;
    await fisAyari(true);
    const once = await kayitlar();
    expect(await fisAyari(false)).toMatchObject({ fisteFiyatlar: false });
    expect(await kayitlar()).toBe(once + 1);
    await fisAyari(false);
    expect(await kayitlar()).toBe(once + 1);
    expect(await fisAyari(true)).toMatchObject({ fisteFiyatlar: true });
    expect(await kayitlar()).toBe(once + 2);
  });
});

describe("adresteki fiş numaraları", () => {
  it("virgülle ayrılır, boşluk ve küçük harf düzelir, tekrar tek sayılır", () => {
    expect(fisNumaralariniOku("DEN-1001")).toEqual(["DEN-1001"]);
    expect(fisNumaralariniOku("DEN-1001,den-1002, DEN-1001")).toEqual(["DEN-1001", "DEN-1002"]);
  });

  it("biri geçersizse, boşsa, sonda virgül varsa ya da değer tek metin değilse hiçbiri okunmaz", () => {
    expect(fisNumaralariniOku("DEN-1001,<b>")).toBeUndefined();
    expect(fisNumaralariniOku("")).toBeUndefined();
    expect(fisNumaralariniOku("DEN-1001,")).toBeUndefined();
    expect(fisNumaralariniOku(["DEN-1001", "DEN-1002"])).toBeUndefined();
    expect(fisNumaralariniOku(undefined)).toBeUndefined();
  });

  it("en çok fisEnCok numara; bir fazlası okunmaz", () => {
    const numaralar = (sayi: number) =>
      Array.from({ length: sayi }, (_, sira) => `DEN-${1000 + sira}`).join(",");
    expect(fisNumaralariniOku(numaralar(siparisSinirlari.fisEnCok))).toHaveLength(
      siparisSinirlari.fisEnCok,
    );
    expect(fisNumaralariniOku(numaralar(siparisSinirlari.fisEnCok + 1))).toBeUndefined();
  });
});
