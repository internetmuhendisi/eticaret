// Tema ekranının verisi gerçek veritabanıyla (kart 0148): sitenin kullanabileceği temalar sırasıyla, seçili tema,
// hazır temanın demo bağlantısı (demo adresi yoksa yok), siteye özel temada bağlantı olmaması, her temaya geçerken
// gönderilecek ayarlar (yeni temanın kabul etmediği seçenek atılır, filtrenin yeri ve koyu tema kalır), masaüstünde
// filtrenin bugünkü yeri ve "Mağaza sahibi temayı değiştirebilir".
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { type Site, siteKlasorunuOku } from "../../ayar-semasi/site-klasoru.ts";
import { temaDemosuAdresiDegiskeni } from "../../kayitlar/site.ts";
import { temaDemosu } from "../../kayitlar/tema.ts";
import { metinOkuyucu } from "../../metinler/metin.ts";
import { siteninTemaServisi } from "../../moduller/tema/servis.ts";
import { baglantiyiKapat, siteninVeritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import { temaEkraniVerisi } from "../tema/veri.ts";

const metin = metinOkuyucu("tr");
const siteAnahtari = Symbol.for("cekirdek.calisanSite");
const ortak = globalThis as Record<symbol, unknown>;
// Kendi teması olan site: canli-carsi (hazır, başlangıç) ve ozel-tema (siteye özel).
const site = siteKlasorunuOku(
  resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler/tema-ozel-ve-hazir"),
);
const demo = "https://demo.ornek.test";
let sil: () => Promise<void>;

beforeAll(async () => {
  const deneme = await denemeSitesiAc("tema-ekrani");
  sil = deneme.sil;
  vi.stubEnv("VERITABANI_ADRESI", deneme.baglantiAdresi);
  vi.stubEnv(temaDemosuAdresiDegiskeni, demo);
  await baglantiyiKapat();
  ortak[siteAnahtari] = site;
});

afterAll(async () => {
  delete ortak[siteAnahtari];
  await baglantiyiKapat();
  vi.unstubAllEnvs();
  await sil();
});

const kur = (degisiklik: Partial<Site["ayarlar"]>) => {
  ortak[siteAnahtari] = { ...site, ayarlar: { ...site.ayarlar, ...degisiklik } };
};

describe("tema ekranının verisi", () => {
  it("temalar sırasıyla; hazır temada demo bağlantısı, siteye özel temada yok; başlangıç teması seçili", async () => {
    kur({});
    const veri = await temaEkraniVerisi();
    expect(veri.sira).toBe(1);
    expect(veri.degistirilebilir).toBe(true);
    expect(veri.filtreYeri).toBe("solda");
    expect(
      veri.temalar.map(({ kod, kaynak, secili, demo: baglanti }) => [
        kod,
        kaynak,
        secili,
        baglanti,
      ]),
    ).toEqual([
      ["canli-carsi", "cekirdek", true, `${demo}/?${temaDemosu.parametre}=canli-carsi`],
      ["ozel-tema", "site", false, undefined],
    ]);
    // Hazır temanın adı metin dosyasından, siteye özel temanınki kendi dosyasından.
    expect(veri.temalar.map((tema) => tema.ad)).toEqual([metin("tema.ad.canliCarsi"), "Özel Tema"]);
  });

  it("geçerken gönderilecek ayarlar: yeni temanın kabul etmediği seçenek atılır, filtrenin yeri ve koyu tema kalır", async () => {
    kur({});
    await siteninTemaServisi().temayiYayinla(
      siteninVeritabani(),
      { tur: "yonetici", kimlik: randomUUID() },
      {
        tema: "canli-carsi",
        ayarlar: { kose: "orta", dugmeBicimi: "hap", koyuTema: true, urunFiltresi: "ustte" },
      },
    );
    const veri = await temaEkraniVerisi();
    expect(veri.sira).toBe(2);
    expect(veri.filtreYeri).toBe("ustte");
    const [canli, ozel] = veri.temalar;
    expect(canli?.ayarlar).toEqual({
      renkler: {},
      kose: "orta",
      dugmeBicimi: "hap",
      koyuTema: true,
      urunFiltresi: "ustte",
    });
    // Özel temada "orta" köşe ve düğme biçimi seçeneği yok.
    expect(ozel?.ayarlar).toEqual({ renkler: {}, koyuTema: true, urunFiltresi: "ustte" });
  });

  it("demo adresi yoksa hiçbir temada bağlantı yok; ayar kapalıysa değiştirilemez", async () => {
    kur({ temaDegistirilebilir: false });
    vi.stubEnv(temaDemosuAdresiDegiskeni, "");
    try {
      const veri = await temaEkraniVerisi();
      expect(veri.temalar.map((tema) => tema.demo)).toEqual([undefined, undefined]);
      expect(veri.degistirilebilir).toBe(false);
    } finally {
      vi.stubEnv(temaDemosuAdresiDegiskeni, demo);
    }
  });
});
