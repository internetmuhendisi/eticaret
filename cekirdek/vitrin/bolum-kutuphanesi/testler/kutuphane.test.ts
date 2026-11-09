// Bölüm kütüphanesinin tutarlılığı (kart 0106): her tarifin görünüşü var ve her görünüşün tarifi var, kodlar
// kalıba uygun, görünüm kodları tekil, listenin sınırları doğru, alan kodları değişiklik kaydına yazılabilir.
// Çekirdeğin kütüphanesi ve deneme kütüphanesi aynı kurallardan geçer.
import { describe, expect, it } from "vitest";
import { denemeGorunumleri } from "../../../katalog/deneme-bolumu/gorunum.tsx";
import { denemeKutuphanesi } from "../../../katalog/deneme-bolumu/tarif.ts";
import { type BolumKutuphanesi, kutuphaneSorunlari } from "../duzen.ts";
import { bolumGorunumleri } from "../gorunumler.tsx";
import { bolumKutuphanesi } from "../kutuphane.ts";
import type { BolumTarifi } from "../tarif.ts";

describe("bölüm kütüphanesi", () => {
  it.each([
    ["çekirdek", bolumKutuphanesi, bolumGorunumleri],
    ["deneme", denemeKutuphanesi, denemeGorunumleri],
  ] as const)(
    "%s: tarifler kurallara uyar, her türün görünüşü vardır",
    (_, kutuphane, gorunumler) => {
      expect(kutuphaneSorunlari(kutuphane)).toEqual([]);
      expect(Object.keys(gorunumler).sort()).toEqual(Object.keys(kutuphane).sort());
    },
  );

  it("deneme bölümleri çekirdeğin kütüphanesinde yoktur", () => {
    for (const tur of Object.keys(denemeKutuphanesi)) {
      expect(Object.hasOwn(bolumKutuphanesi, tur)).toBe(false);
    }
  });

  it("bozuk tarifler yakalanır", () => {
    const temel = denemeKutuphanesi["deneme-seridi"] as BolumTarifi;
    const bozuk: BolumKutuphanesi = {
      "farkli-anahtar": temel,
      "Buyuk Harf": { ...temel, tur: "Buyuk Harf" },
      "gorunum-tekrari": {
        ...temel,
        tur: "gorunum-tekrari",
        gorunumler: [temel.gorunumler[0], temel.gorunumler[0]],
      },
      "kayda-yazilamaz": {
        ...temel,
        tur: "kayda-yazilamaz",
        alanlar: { telefon: { tur: "metin", ad: temel.ad, enCok: 20 } },
      },
      "liste-siniri": {
        ...temel,
        tur: "liste-siniri",
        alanlar: {
          maddeler: {
            tur: "liste",
            ad: temel.ad,
            ogeAdi: temel.ad,
            enAz: 3,
            enCok: 2,
            alanlar: {},
          },
        },
      },
    };
    const sorunlar = kutuphaneSorunlari(bozuk).join("\n");
    expect(sorunlar).toContain("bolum farkli-anahtar: kayıt anahtarı türün koduyla aynı değil");
    expect(sorunlar).toContain("bolum Buyuk Harf: tür kodu kalıba uymuyor");
    expect(sorunlar).toContain("bolum gorunum-tekrari: görünüm tekrarı");
    expect(sorunlar).toContain("bolum kayda-yazilamaz: alan kodu kayda yazılamaz: telefon");
    expect(sorunlar).toContain("bolum liste-siniri: maddeler: listenin sınırları yanlış");
  });
});
