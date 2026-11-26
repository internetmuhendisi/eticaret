// Kupon uçları gerçek istek ve veritabanıyla (kart 0313, karar 0188): mağaza sahibi kuponu formun yazılışıyla ekler
// (tutar sitenin para biçimiyle, zaman sitenin saat diliminde), değiştirir, kapatır ve açar; eski ekranın değişikliği
// 409 alır ve hiçbir şey yazılmaz; hatalı alanlar alanın yolu ve koduyla birlikte 400 alır; kod başka kuponda varsa
// 409. Liste ucu durum sekmesi ve aramayla süzer. Görevli listeyi görür, ekleyemez ve değiştiremez; rolsüz yönetici,
// müşteri ve girişsiz ziyaretçi reddedilir; hiçbir şey değişmez. Her rolün erişimini ayrıca rol-uc-erisimi.test.ts
// dener.
import { randomBytes, randomUUID } from "node:crypto";
import { join, resolve } from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { siteKlasorunuOku } from "../../ayar-semasi/site-klasoru.ts";
import { yerelZamandan } from "../../metinler/bicimleyici.ts";
import { roller, yoneticiRolleri } from "../../moduller/ekip/model.ts";
import { kuponKapsami, kuponlar } from "../../moduller/kampanya/model.ts";
import { hesapAc } from "../../moduller/oturum/servis.ts";
import { urunServisi } from "../../moduller/urun/servis.ts";
import { baglantiyiKapat, type Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import { kuponDegisikligiUcu, kuponEklemeUcu, kuponListesiUcu } from "../yonetici/kupon.ts";
import { oturumCerezi } from "./erisim-denemesi.ts";

const ornekler = resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler");
const ortak = globalThis as Record<symbol, unknown>;
const siteAnahtari = Symbol.for("cekirdek.calisanSite");
const site = siteKlasorunuOku(join(ornekler, "gecerli"));

let vt: Veritabani;
let sil: () => Promise<void>;
let sayac = 0;

beforeAll(async () => {
  const deneme = await denemeSitesiAc("kupon-uclari");
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

const hesap = async (kisi: "magaza-sahibi" | "gorevli" | "rolsuz" | "musteri") => {
  sayac += 1;
  const tur = kisi === "musteri" ? "musteri" : "yonetici";
  const eposta = `kupon-ucu${sayac}-${randomBytes(3).toString("hex")}@ornek.test`;
  const { hesapKimligi } = await hesapAc(vt, tur, { eposta, sifre: "uzun-bir-deneme-sifresi" });
  if (kisi === "magaza-sahibi" || kisi === "gorevli") {
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

const istek = (yol: string, oturum: string | undefined, govde?: unknown) =>
  new Request(`http://magaza.ornek.test/kapi/yonetici/${yol}`, {
    method: govde === undefined ? "GET" : "POST",
    headers: {
      "x-forwarded-for": `2001:db8:${randomBytes(2).toString("hex")}::1`,
      ...(oturum === undefined ? {} : { cookie: oturum }),
    },
    ...(govde === undefined ? {} : { body: JSON.stringify(govde) }),
  });

const govdesi = async <T>(yanit: Response): Promise<T> => (await yanit.json()) as T;
const veri = async <T>(yanit: Response): Promise<T> => (await govdesi<{ veri: T }>(yanit)).veri;

const kupon = (ek: Record<string, unknown> = {}) => ({
  kod: `UC${randomBytes(3).toString("hex").toUpperCase()}`,
  ad: "",
  tur: "tutar",
  deger: "50,00",
  enAzTutar: "500,00",
  kapsam: "hepsi",
  kapsamKayitlari: [],
  baslangic: "2030-12-01T09:00",
  bitis: "2030-12-31T23:59",
  toplamSinir: "100",
  kisiBasiSinir: "1",
  indirimdeGecmez: true,
  acik: true,
  ...ek,
});

const satiri = async (kimlik: string) => {
  const [satir] = await vt.select().from(kuponlar).where(eq(kuponlar.kimlik, kimlik));
  if (satir === undefined) throw new Error("Kupon yok.");
  return satir;
};

describe("kupon uçları", () => {
  it("mağaza sahibi formun yazılışıyla ekler, değiştirir, kapatır ve açar; liste süzer", async () => {
    const sahip = await hesap("magaza-sahibi");
    const urun = await urunServisi(() => site.ayarlar.saatDilimi).urunEkle(
      vt,
      { tur: "yonetici", kimlik: randomUUID() },
      { ad: "Uçtan ürün", vergiSinifi: null },
    );
    const ekleme = await kuponEklemeUcu(
      istek("kupon-ekle", sahip, { kupon: kupon({ kapsam: "urunler", kapsamKayitlari: [urun] }) }),
    );
    expect(ekleme.status).toBe(200);
    const { kimlik } = await veri<{ kimlik: string }>(ekleme);
    const satir = await satiri(kimlik);
    expect(satir).toMatchObject({
      tur: "tutar",
      deger: 5_000,
      en_az_tutar: 50_000,
      toplam_sinir: 100,
      kisi_basi_sinir: 1,
      indirimde_gecmez: true,
      kapsam: "urunler",
    });
    expect(satir.baslangic_zamani).toEqual(
      yerelZamandan("2030-12-01T09:00", site.ayarlar.saatDilimi),
    );
    expect(
      await vt.select().from(kuponKapsami).where(eq(kuponKapsami.kupon_kimligi, kimlik)),
    ).toHaveLength(1);
    // Liste: zamanlanmış sekmesinde, kodla aranır.
    const liste = await veri<{ satirlar: { kod: string; durum: string }[] }>(
      await kuponListesiUcu(istek(`kuponlar?durum=zamanlanmis&ara=${satir.kod.slice(2)}`, sahip)),
    );
    expect(liste.satirlar).toEqual([
      expect.objectContaining({ kod: satir.kod, durum: "zamanlanmis" }),
    ]);
    // Değişiklik: yalnız verilenler; yanıt yeni değişme anı.
    const gorulen = satir.degisme_zamani.toISOString();
    const degisim = await kuponDegisikligiUcu(
      istek("kupon-degistir", sahip, {
        kimlik,
        gorulen,
        kupon: { tur: "yuzde", deger: "15", bitis: "", acik: false },
      }),
    );
    expect(degisim.status).toBe(200);
    const yeni = await veri<{ gorulen: string }>(degisim);
    expect(await satiri(kimlik)).toMatchObject({
      tur: "yuzde",
      deger: 15,
      bitis_zamani: null,
      acik: false,
      en_az_tutar: 50_000,
    });
    // Eski ekran: 409, hiçbir şey yazılmaz.
    const eski = await kuponDegisikligiUcu(
      istek("kupon-degistir", sahip, { kimlik, gorulen, kupon: { acik: true } }),
    );
    expect(eski.status).toBe(409);
    expect(await govdesi(eski)).toMatchObject({
      hata: { kod: "cakisma", ayrinti: [{ alan: "kupon", kod: "kupon-degisti" }] },
    });
    expect((await satiri(kimlik)).acik).toBe(false);
    // Açma.
    const ac = await kuponDegisikligiUcu(
      istek("kupon-degistir", sahip, { kimlik, gorulen: yeni.gorulen, kupon: { acik: true } }),
    );
    expect(ac.status).toBe(200);
    expect((await satiri(kimlik)).acik).toBe(true);
    // İndirim türsüz gelmez.
    const tursuz = await kuponDegisikligiUcu(
      istek("kupon-degistir", sahip, {
        kimlik,
        gorulen: (await satiri(kimlik)).degisme_zamani.toISOString(),
        kupon: { deger: "20" },
      }),
    );
    expect(tursuz.status).toBe(400);
    // Tür de indirimsiz gelmez (eski indirim yeni türde başka anlama gelirdi); ücretsiz kargo indirimsizdir.
    const gorulenSon = (await satiri(kimlik)).degisme_zamani.toISOString();
    const indirimsiz = await kuponDegisikligiUcu(
      istek("kupon-degistir", sahip, { kimlik, gorulen: gorulenSon, kupon: { tur: "tutar" } }),
    );
    expect(indirimsiz.status).toBe(400);
    expect((await satiri(kimlik)).tur).toBe("yuzde");
    const kargo = await kuponDegisikligiUcu(
      istek("kupon-degistir", sahip, {
        kimlik,
        gorulen: gorulenSon,
        kupon: { tur: "ucretsiz-kargo" },
      }),
    );
    expect(kargo.status).toBe(200);
    expect(await satiri(kimlik)).toMatchObject({ tur: "ucretsiz-kargo", deger: 0 });
  });

  it("hatalı alanlar birlikte alanın yolu ve koduyla 400; kod başka kuponda varsa 409; hiçbir şey yazılmaz", async () => {
    const sahip = await hesap("magaza-sahibi");
    const once = (await vt.select().from(kuponlar)).length;
    const hatali = await kuponEklemeUcu(
      istek("kupon-ekle", sahip, {
        kupon: kupon({
          deger: "elli",
          toplamSinir: "0",
          bitis: "2030-11-01T09:00",
          kapsam: "kategoriler",
        }),
      }),
    );
    expect(hatali.status).toBe(400);
    expect(await govdesi(hatali)).toMatchObject({
      hata: { kod: "dogrulama", ayrinti: [{ alan: "deger", kod: "tutar-okunamadi" }] },
    });
    const kurallar = await kuponEklemeUcu(
      istek("kupon-ekle", sahip, {
        kupon: kupon({ toplamSinir: "0", bitis: "2030-11-01T09:00", kapsam: "kategoriler" }),
      }),
    );
    expect(kurallar.status).toBe(400);
    expect(await govdesi(kurallar)).toMatchObject({
      hata: {
        kod: "dogrulama",
        ayrinti: [
          { alan: "toplamSinir", kod: "sayi-gecersiz" },
          { alan: "bitis", kod: "sure-ters" },
          { alan: "kapsamKayitlari", kod: "kapsam-bos" },
        ],
      },
    });
    const ilk = await kuponEklemeUcu(
      istek("kupon-ekle", sahip, { kupon: kupon({ kod: "AYNIKOD" }) }),
    );
    expect(ilk.status).toBe(200);
    const tekrar = await kuponEklemeUcu(
      istek("kupon-ekle", sahip, { kupon: kupon({ kod: "aynikod" }) }),
    );
    expect(tekrar.status).toBe(409);
    expect(await govdesi(tekrar)).toMatchObject({
      hata: { kod: "cakisma", ayrinti: [{ alan: "kod", kod: "kod-var" }] },
    });
    expect((await vt.select().from(kuponlar)).length).toBe(once + 1);
  });

  it("görevli listeyi görür, ekleyemez ve değiştiremez; rolsüz yönetici, müşteri ve girişsiz ziyaretçi reddedilir", async () => {
    const sahip = await hesap("magaza-sahibi");
    const { kimlik } = await veri<{ kimlik: string }>(
      await kuponEklemeUcu(istek("kupon-ekle", sahip, { kupon: kupon() })),
    );
    const gorulen = (await satiri(kimlik)).degisme_zamani.toISOString();
    const degisiklik = { kimlik, gorulen, kupon: { acik: false } };
    const gorevli = await hesap("gorevli");
    expect((await kuponListesiUcu(istek("kuponlar", gorevli))).status).toBe(200);
    expect((await kuponEklemeUcu(istek("kupon-ekle", gorevli, { kupon: kupon() }))).status).toBe(
      403,
    );
    expect((await kuponDegisikligiUcu(istek("kupon-degistir", gorevli, degisiklik))).status).toBe(
      403,
    );
    for (const [kisi, beklenen] of [
      ["rolsuz", 403],
      ["musteri", 401],
    ] as const) {
      const oturum = await hesap(kisi);
      expect((await kuponListesiUcu(istek("kuponlar", oturum))).status).toBe(beklenen);
      expect((await kuponEklemeUcu(istek("kupon-ekle", oturum, { kupon: kupon() }))).status).toBe(
        beklenen,
      );
      expect((await kuponDegisikligiUcu(istek("kupon-degistir", oturum, degisiklik))).status).toBe(
        beklenen,
      );
    }
    expect((await kuponListesiUcu(istek("kuponlar", undefined))).status).toBe(401);
    expect((await kuponDegisikligiUcu(istek("kupon-degistir", undefined, degisiklik))).status).toBe(
      401,
    );
    expect((await satiri(kimlik)).acik).toBe(true);
  });
});
