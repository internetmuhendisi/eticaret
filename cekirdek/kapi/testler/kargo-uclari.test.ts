// Kargo ayarları uçları gerçek istek ve veritabanıyla (kart 0212, karar 0135): mağaza sahibi tutarları sitenin para
// biçimiyle yazar, kuruş olarak kaydedilir; değişen her ayar değişiklik kaydına bir kez girer, aynı kalan girmez; boş
// sınır sınırı kaldırır; okunamayan, sınır dışı tutar ve geçersiz gün alanın koduyla döner, hiçbir ayar değişmez.
// Görevli, rolsüz yönetici, müşteri ve girişsiz ziyaretçi ne okur ne değiştirir. Her rolün her uçtaki erişimini ayrıca
// rol-uc-erisimi.test.ts dener.
import { randomBytes } from "node:crypto";
import { join, resolve } from "node:path";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { siteKlasorunuOku } from "../../ayar-semasi/site-klasoru.ts";
import { degisiklikKayitlari } from "../../moduller/degisiklik-kaydi/model.ts";
import { roller, yoneticiRolleri } from "../../moduller/ekip/model.ts";
import { hesapAc } from "../../moduller/oturum/servis.ts";
import { baglantiyiKapat, type Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import { kargoAyarlariDurumuUcu, kargoAyarlariUcu } from "../yonetici/kargo.ts";
import { oturumCerezi } from "./erisim-denemesi.ts";

const ornekler = resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler");
const ortak = globalThis as Record<symbol, unknown>;
const siteAnahtari = Symbol.for("cekirdek.calisanSite");
const site = siteKlasorunuOku(join(ornekler, "gecerli"));

let vt: Veritabani;
let sil: () => Promise<void>;
let sayac = 0;

beforeAll(async () => {
  const deneme = await denemeSitesiAc("kargo-uclari");
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

const cerez = async (kisi: "magaza-sahibi" | "gorevli" | "rolsuz" | "musteri") => {
  sayac += 1;
  const tur = kisi === "musteri" ? "musteri" : "yonetici";
  const { hesapKimligi } = await hesapAc(vt, tur, {
    eposta: `kargo${sayac}-${randomBytes(3).toString("hex")}@ornek.test`,
    sifre: "uzun-bir-deneme-sifresi",
  });
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
  return { oturum: await oturumCerezi(vt, tur, hesapKimligi), hesapKimligi };
};

const istek = (oturum: string | undefined, govde?: unknown) =>
  new Request("http://magaza.ornek.test/kapi/yonetici/kargo-ayarlari", {
    method: govde === undefined ? "GET" : "POST",
    headers: {
      "x-forwarded-for": `2001:db8:${randomBytes(2).toString("hex")}::1`,
      ...(oturum === undefined ? {} : { cookie: oturum }),
    },
    ...(govde === undefined ? {} : { body: JSON.stringify(govde) }),
  });

const kayitlar = (yapan: string) =>
  vt
    .select({ eski: degisiklikKayitlari.eski_deger, yeni: degisiklikKayitlari.yeni_deger })
    .from(degisiklikKayitlari)
    .where(
      and(
        eq(degisiklikKayitlari.islem, "magaza-ayari.degisti"),
        eq(degisiklikKayitlari.kim_kimligi, yapan),
      ),
    );

const durum = async (oturum: string | undefined) =>
  (await (await kargoAyarlariDurumuUcu(istek(oturum))).json()) as {
    basarili: boolean;
    veri: Record<string, unknown>;
  };

describe("kargo ayarları uçları", () => {
  it("mağaza sahibi tutarları sitenin biçimiyle yazar; değişen ayar kayda bir kez girer; boş sınır sınırı kaldırır", async () => {
    const { oturum, hesapKimligi } = await cerez("magaza-sahibi");
    // Başlangıç: ücret 0 (kargo ücretsiz), sınır yok.
    expect(await durum(oturum)).toEqual({
      basarili: true,
      veri: { kargoUcreti: 0, ucretsizKargoTutari: "indirimden-sonra", kargoyaVermeSuresi: 1 },
    });
    const yeni = {
      kargoUcreti: "59,9",
      ucretsizKargoSiniri: "1.250,50",
      ucretsizKargoTutari: "indirimden-once",
      kargoyaVermeSuresi: "2",
    };
    const yanit = await kargoAyarlariUcu(istek(oturum, yeni));
    expect(yanit.status).toBe(200);
    const beklenen = {
      kargoUcreti: 5_990,
      ucretsizKargoSiniri: 125_050,
      ucretsizKargoTutari: "indirimden-once",
      kargoyaVermeSuresi: 2,
    };
    expect(await yanit.json()).toEqual({ basarili: true, veri: beklenen });
    expect(await durum(oturum)).toEqual({ basarili: true, veri: beklenen });
    expect(await kayitlar(hesapKimligi)).toHaveLength(4);
    // Aynı değerler (başka yazılışla) kayda girmez.
    await kargoAyarlariUcu(istek(oturum, { ...yeni, ucretsizKargoSiniri: "1250,5" }));
    expect(await kayitlar(hesapKimligi)).toHaveLength(4);
    // Boş sınır sınırı kaldırır.
    await kargoAyarlariUcu(istek(oturum, { ...yeni, ucretsizKargoSiniri: " " }));
    const { ucretsizKargoSiniri: _sinir, ...sinirsiz } = beklenen;
    expect(await durum(oturum)).toEqual({ basarili: true, veri: sinirsiz });
    expect(await kayitlar(hesapKimligi)).toHaveLength(5);
  });

  it.each([
    [
      "üç ondalıklı ücret",
      { kargoUcreti: "1,234" },
      [{ alan: "kargoUcreti", kod: "tutar-okunamadi" }],
    ],
    [
      "simgeli ücret",
      { kargoUcreti: "59,90 ₺" },
      [{ alan: "kargoUcreti", kod: "tutar-okunamadi" }],
    ],
    [
      "sıfır sınır",
      { ucretsizKargoSiniri: "0" },
      [{ alan: "ucretsizKargoSiniri", kod: "tutar-sinir-disi" }],
    ],
    [
      "çok büyük ücret",
      { kargoUcreti: "1.000.001" },
      [{ alan: "kargoUcreti", kod: "tutar-sinir-disi" }],
    ],
    [
      "sayı olmayan gün",
      { kargoyaVermeSuresi: "iki" },
      [{ alan: "kargoyaVermeSuresi", kod: "gun-gecersiz" }],
    ],
    [
      "sınır dışı gün",
      { kargoyaVermeSuresi: "61" },
      [{ alan: "kargoyaVermeSuresi", kod: "gun-gecersiz" }],
    ],
    [
      "iki alan birden",
      { kargoUcreti: "x", kargoyaVermeSuresi: "-1" },
      [
        { alan: "kargoUcreti", kod: "tutar-okunamadi" },
        { alan: "kargoyaVermeSuresi", kod: "gun-gecersiz" },
      ],
    ],
  ])("%s alanın koduyla döner, hiçbir ayar değişmez", async (_ad, bozuk, ayrinti) => {
    const { oturum } = await cerez("magaza-sahibi");
    const once = await durum(oturum);
    const yanit = await kargoAyarlariUcu(
      istek(oturum, {
        kargoUcreti: "10",
        ucretsizKargoSiniri: "500",
        ucretsizKargoTutari: "indirimden-sonra",
        kargoyaVermeSuresi: "3",
        ...bozuk,
      }),
    );
    expect(yanit.status).toBe(400);
    expect(await yanit.json()).toEqual({ basarili: false, hata: { kod: "dogrulama", ayrinti } });
    expect(await durum(oturum)).toEqual(once);
  });

  it.each([
    ["görevli", "gorevli", 403, "yetki"],
    ["rolsüz yönetici", "rolsuz", 403, "yetki"],
    ["müşteri", "musteri", 401, "oturum-yok"],
    ["girişsiz ziyaretçi", "girissiz", 401, "oturum-yok"],
  ] as const)("%s kargo ayarlarını ne okur ne değiştirir", async (_ad, kisi, kod, hata) => {
    const sahip = await cerez("magaza-sahibi");
    const once = await durum(sahip.oturum);
    const oturum = kisi === "girissiz" ? undefined : (await cerez(kisi)).oturum;
    for (const yanit of [
      await kargoAyarlariDurumuUcu(istek(oturum)),
      await kargoAyarlariUcu(
        istek(oturum, {
          kargoUcreti: "1",
          ucretsizKargoSiniri: "",
          ucretsizKargoTutari: "indirimden-sonra",
          kargoyaVermeSuresi: "0",
        }),
      ),
    ]) {
      expect(yanit.status).toBe(kod);
      expect(await yanit.json()).toMatchObject({ basarili: false, hata: { kod: hata } });
    }
    expect(await durum(sahip.oturum)).toEqual(once);
  });
});
