// Kart 0201: birim testlerinden sonra ortak site veritabanındaki mağaza ayarlarının sitenin kendi başlangıç değerleri
// olduğunu ölçen denetimin karar kuralı. Gerçek veritabanıyla ölçüm kontrol hattındaki ayrı adımdadır
// (pnpm baslangic-ayarlari-denetle siteler/ornek-magaza).
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { magazaAyarSemasi } from "../../cekirdek/ayar-semasi/ayarlar.ts";
import { siteKlasorunuOku } from "../../cekirdek/ayar-semasi/site-klasoru.ts";
import { saklanan } from "../../cekirdek/moduller/magaza-ayarlari/servis.ts";
import { type AyarSatiri, baslangictanAyrilanlar } from "../baslangic-ayarlari.mts";

const kok = resolve(import.meta.dirname, "../..");
const ornekMagaza = siteKlasorunuOku(resolve(kok, "siteler/ornek-magaza"));
const denemeDemosu = siteKlasorunuOku(
  resolve(kok, "cekirdek/ayar-semasi/testler/ornek-siteler/tema-demosu"),
);

// Servisin başlangıçta yazdığı satırlar: şemanın her ayarı, boş olan da (null), saklandığı biçimde.
const yazilanlar = (baslangic: Record<string, unknown>): AyarSatiri[] =>
  Object.keys(magazaAyarSemasi.shape).map((anahtar) => ({
    anahtar,
    deger: saklanan(baslangic[anahtar]),
  }));

describe("başlangıç ayarlarının denetimi", () => {
  it("sitenin kendi başlangıç değerleri temizdir", () => {
    expect(
      baslangictanAyrilanlar(yazilanlar(ornekMagaza.baslangic), ornekMagaza.baslangic),
    ).toEqual([]);
  });

  it("hiç yazılmamış ayar temizdir", () => {
    expect(baslangictanAyrilanlar([], ornekMagaza.baslangic)).toEqual([]);
  });

  it("başka sitenin başlangıç değerleri yakalanır (kartın bulgusu)", () => {
    const ayrilanlar = baslangictanAyrilanlar(
      yazilanlar(denemeDemosu.baslangic),
      ornekMagaza.baslangic,
    );
    expect(ayrilanlar).toContain("magazaAdi");
    expect(ayrilanlar).toContain("iletisimEpostasi");
  });

  it("tek bir ayarın değişmesi yakalanır, iç içe değer de", () => {
    const satirlar = yazilanlar(ornekMagaza.baslangic);
    const degistir = (anahtar: string, deger: unknown) =>
      satirlar.map((satir) => (satir.anahtar === anahtar ? { anahtar, deger } : satir));
    expect(baslangictanAyrilanlar(degistir("listeSayfaBoyutu", 12), ornekMagaza.baslangic)).toEqual(
      ["listeSayfaBoyutu"],
    );
    expect(
      baslangictanAyrilanlar(
        degistir("sosyalHesaplar", [{ site: "instagram", hesap: "baska" }]),
        ornekMagaza.baslangic,
      ),
    ).toEqual(["sosyalHesaplar"]);
  });

  it("şemada olmayan ayar yakalanır", () => {
    expect(
      baslangictanAyrilanlar([{ anahtar: "bilinmeyen", deger: 1 }], ornekMagaza.baslangic),
    ).toEqual(["bilinmeyen"]);
  });
});
