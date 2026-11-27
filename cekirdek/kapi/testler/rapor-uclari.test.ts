// Satış raporunun CSV ucu gerçek istek ve veritabanıyla (kart 0317, karar 0195): mağaza sahibi ekrandaki raporun
// aynısını indirir (bayt bayt servisin dosyası, ekli dosya adı, önbelleksiz); karşılaştırma kapatılabilir; geçersiz
// dönem sitenin varsayılan dönemine düşer, varsayılan dönem mağaza ayarıdır; sınırı aşan ve tanımsız girdi 400 alır.
// Görevli, sipariş görevlisi ve rolsüz yönetici yetki; müşteri ve girişsiz ziyaretçi oturum-yok alır. Her rolün erişimini ayrıca
// rol-uc-erisimi.test.ts dener.
import { randomBytes, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { type Site, siteKlasorunuOku } from "../../ayar-semasi/site-klasoru.ts";
import { takvimGunu } from "../../metinler/bicimleyici.ts";
import { metin, siteninBicimleyicisi } from "../../metinler/site-metni.ts";
import { roller, yoneticiRolleri } from "../../moduller/ekip/model.ts";
import { siteninFiyatServisi } from "../../moduller/fiyat/servis.ts";
import { siteninServisi } from "../../moduller/magaza-ayarlari/servis.ts";
import { odemeBilgileriSemasi } from "../../moduller/odeme/semalar.ts";
import { odemeServisi } from "../../moduller/odeme/servis.ts";
import { hesapAc } from "../../moduller/oturum/servis.ts";
import { satisRaporuCsv } from "../../moduller/rapor/csv.ts";
import { donemGunleri, karsilastirmaDonemi, oncekiDonem } from "../../moduller/rapor/donem.ts";
import { satisRaporu } from "../../moduller/rapor/satis.ts";
import { siparisler } from "../../moduller/siparis/model.ts";
import { siparisYonetimi } from "../../moduller/siparis/yonetim.ts";
import { stokServisi } from "../../moduller/stok/servis.ts";
import { urunServisi } from "../../moduller/urun/servis.ts";
import { siteninVergiServisi } from "../../moduller/vergi/servis.ts";
import { baglantiyiKapat, type Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import { satisRaporuCsvUcu } from "../yonetici/rapor.ts";
import { oturumCerezi } from "./erisim-denemesi.ts";

vi.setConfig({ testTimeout: 90_000 });

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
    odemeYontemleri: [{ kod: "havale", acik: true }],
    bankaHesaplari: [
      {
        kimlik: randomUUID(),
        banka: "Deneme Bankası",
        sahip: "Deneme Ticaret",
        iban: "TR420001000000000000000001",
      },
    ],
  },
};
const ortak = globalThis as Record<symbol, unknown>;
const siteAnahtari = Symbol.for("cekirdek.calisanSite");
const yapan = () => ({ tur: "yonetici" as const, kimlik: randomUUID() });

let vt: Veritabani;
let sil: () => Promise<void>;
let sayac = 0;

beforeAll(async () => {
  const deneme = await denemeSitesiAc("rapor-uclari");
  vt = deneme.vt;
  sil = deneme.sil;
  vi.stubEnv("VERITABANI_ADRESI", deneme.baglantiAdresi);
  vi.stubEnv("IKI_ASAMA_ANAHTARI", randomBytes(32).toString("hex"));
  await baglantiyiKapat();
}, 60_000);
beforeEach(() => {
  ortak[siteAnahtari] = site;
});
afterAll(async () => {
  delete ortak[siteAnahtari];
  await baglantiyiKapat();
  vi.unstubAllEnvs();
  await sil();
});

const hesap = async (
  kisi: "magaza-sahibi" | "gorevli" | "siparis-gorevlisi" | "rolsuz" | "musteri",
) => {
  sayac += 1;
  const tur = kisi === "musteri" ? "musteri" : "yonetici";
  const eposta = `rapor-ucu${sayac}-${randomBytes(3).toString("hex")}@ornek.test`;
  const { hesapKimligi } = await hesapAc(vt, tur, { eposta, sifre: "uzun-bir-deneme-sifresi" });
  if (tur === "yonetici" && kisi !== "rolsuz") {
    const [rol] = await vt
      .select({ kimlik: roller.kimlik })
      .from(roller)
      .where(eq(roller.kod, kisi));
    if (rol === undefined) throw new Error(`${kisi} rolü yok.`);
    await vt
      .insert(yoneticiRolleri)
      .values({ yonetici_kimligi: hesapKimligi, rol_kimligi: rol.kimlik });
  }
  return oturumCerezi(vt, tur, hesapKimligi);
};

const istek = (sorgu: string, oturum: string | undefined) =>
  new Request(`http://magaza.ornek.test/kapi/yonetici/rapor-satis-csv${sorgu}`, {
    headers: {
      "x-forwarded-for": `2001:db8:${randomBytes(2).toString("hex")}::1`,
      ...(oturum === undefined ? {} : { cookie: oturum }),
    },
  });

// Bugün ödenmiş bir havale siparişi.
const satisYap = async () => {
  const urunSrv = urunServisi(() => site.ayarlar.saatDilimi);
  const genel = (await siteninVergiServisi(site).tabloyuOku(vt)).find((s) => s.ad === "Genel");
  const urun = await urunSrv.urunEkle(vt, yapan(), {
    ad: `Rapor ürünü ${randomBytes(3).toString("hex")}`,
    vergiSinifi: genel?.kimlik ?? null,
    durum: "yayinda",
    stokTakibi: true,
  });
  const birim = (await urunSrv.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
  await siteninFiyatServisi(site).fiyatYaz(vt, yapan(), birim, { satisFiyati: 12_345 });
  await stokServisi().stokDuzelt(vt, yapan(), birim, {
    yeniMiktar: 10,
    gorulenMiktar: 0,
    sebep: "sayim",
  });
  const { siparis } = await odemeServisi(site).siparisVer(
    vt,
    {
      kim: { tur: "misafir", eposta: "misafir@ornek.test", hesap: { ac: false } },
      bilgiler: odemeBilgileriSemasi.parse({
        odemeYontemi: { yontem: "havale" },
        teslimat: {
          ad: "Deniz",
          soyad: "Yılmaz",
          telefon: "0555 123 45 67",
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
      kalemler: [{ birim, adet: 2 }],
    },
    3600,
  );
  await siparisYonetimi(site).islemYap(vt, yapan(), {
    numara: siparis.numara,
    islem: "havale-onayla",
    gorulenDurum: "odeme-bekleniyor",
  });
  const [satir] = await vt.select().from(siparisler).where(eq(siparisler.numara, siparis.numara));
  if (satir === undefined) throw new Error("Sipariş yok.");
  return satir;
};

describe("rapor uçları", () => {
  it("mağaza sahibi ekrandaki raporun aynısını CSV olarak indirir; karşılaştırma kapatılır", async () => {
    const sahip = await hesap("magaza-sahibi");
    const siparis = await satisYap();
    const bugun = takvimGunu(new Date(), site.ayarlar.saatDilimi);
    const yanit = await satisRaporuCsvUcu(istek("?donem=bugun", sahip));
    expect(yanit.status).toBe(200);
    expect(yanit.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(yanit.headers.get("cache-control")).toBe("private, no-store");
    expect(yanit.headers.get("content-disposition")).toBe(
      `attachment; filename="satis-raporu-${bugun}-${bugun}.csv"`,
    );
    const dosya = Buffer.from(await yanit.arrayBuffer());
    const gunu = { baslangic: bugun, bitis: bugun };
    const rapor = await satisRaporu(site).rapor(vt, gunu, oncekiDonem(gunu));
    expect(rapor.ozet.satis).toBe(siparis.toplam);
    expect(dosya.equals(satisRaporuCsv(site, rapor))).toBe(true);
    const yazi = dosya.toString("utf8");
    const b = siteninBicimleyicisi(site.ayarlar);
    expect(yazi).toContain(
      `${metin("yonetim.rapor.csv.satir.satis")}${b.csvAyraci()}${b.csvTutari(siparis.toplam)}`,
    );
    expect(yazi).toContain(metin("yonetim.rapor.csv.oncekiDonem"));

    // "Bu ay" önceki ayın aynı günleriyle karşılaştırılır (karar 0195).
    const buAy = donemGunleri({ tur: "hazir", kod: "bu-ay" }, bugun);
    const buAyinKiyasi = karsilastirmaDonemi({ tur: "hazir", kod: "bu-ay" }, buAy);
    expect(buAyinKiyasi.baslangic.slice(8)).toBe("01");
    const ayYazisi = Buffer.from(
      await (await satisRaporuCsvUcu(istek("?donem=bu-ay", sahip))).arrayBuffer(),
    ).toString("utf8");
    expect(ayYazisi).toContain(
      `${metin("yonetim.rapor.csv.oncekiDonem")}${b.csvAyraci()}${buAyinKiyasi.baslangic}${b.csvAyraci()}${buAyinKiyasi.bitis}\r\n`,
    );
    const kiyassiz = await satisRaporuCsvUcu(istek("?donem=bugun&karsilastir=0", sahip));
    const kiyassizYazi = Buffer.from(await kiyassiz.arrayBuffer()).toString("utf8");
    expect(kiyassizYazi).not.toContain(metin("yonetim.rapor.csv.oncekiDonem"));
  });

  it("geçersiz dönem sitenin varsayılan dönemine düşer; varsayılan dönem mağaza ayarıdır", async () => {
    const sahip = await hesap("magaza-sahibi");
    const bugun = takvimGunu(new Date(), site.ayarlar.saatDilimi);
    const adi = (yanit: Response) => yanit.headers.get("content-disposition");
    const otuz = donemGunleri({ tur: "hazir", kod: "son-30-gun" }, bugun);
    for (const sorgu of ["", "?donem=dun", "?donem=2026-10-31_2026-10-01"]) {
      expect(adi(await satisRaporuCsvUcu(istek(sorgu, sahip))), sorgu).toBe(
        `attachment; filename="satis-raporu-${otuz.baslangic}-${otuz.bitis}.csv"`,
      );
    }
    await siteninServisi(site).degistir(vt, yapan(), { raporVarsayilanDonem: "gecen-ay" });
    const gecenAy = donemGunleri({ tur: "hazir", kod: "gecen-ay" }, bugun);
    expect(adi(await satisRaporuCsvUcu(istek("?donem=dun", sahip)))).toBe(
      `attachment; filename="satis-raporu-${gecenAy.baslangic}-${gecenAy.bitis}.csv"`,
    );
    expect(adi(await satisRaporuCsvUcu(istek("?donem=2026-10-01_2026-10-31", sahip)))).toBe(
      `attachment; filename="satis-raporu-2026-10-01-2026-10-31.csv"`,
    );
    await siteninServisi(site).degistir(vt, yapan(), { raporVarsayilanDonem: "son-30-gun" });
  });

  it("sınırı aşan ve tanımsız girdi 400 alır", async () => {
    const sahip = await hesap("magaza-sahibi");
    for (const sorgu of [`?donem=${"a".repeat(41)}`, "?karsilastir=2", "?baska=1"]) {
      expect((await satisRaporuCsvUcu(istek(sorgu, sahip))).status, sorgu).toBe(400);
    }
  });

  it("görevli, sipariş görevlisi ve rolsüz yönetici yetki; müşteri ve girişsiz ziyaretçi oturum-yok alır", async () => {
    for (const kisi of ["gorevli", "siparis-gorevlisi", "rolsuz"] as const) {
      const yanit = await satisRaporuCsvUcu(istek("?donem=bugun", await hesap(kisi)));
      expect(yanit.status, kisi).toBe(403);
      expect(await yanit.json(), kisi).toMatchObject({ hata: { kod: "yetki" } });
    }
    for (const oturum of [await hesap("musteri"), undefined]) {
      const yanit = await satisRaporuCsvUcu(istek("?donem=bugun", oturum));
      expect(yanit.status).toBe(401);
      expect(await yanit.json()).toMatchObject({ hata: { kod: "oturum-yok" } });
    }
  });
});
