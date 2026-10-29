// Uygulamadaki her kapı adresi uç belgesinde yazar, belgedeki her adres uygulamada vardır
// (.claude/rules/sunucu-arayuzu.md). Uç listesi uygulamanın adres dosyalarından okunur.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { kapilar } from "../../kayitlar/kapi.ts";
import type { Uc } from "../uc.ts";

const adresKlasoru = join(import.meta.dirname, "..", "..", "uygulama", "app", "kapi");
const belge = readFileSync(join(import.meta.dirname, "..", "uclar.md"), "utf8");
const yontemler = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;

const adresDosyalari = (klasor: string): string[] =>
  existsSync(klasor)
    ? readdirSync(klasor, { withFileTypes: true }).flatMap((girdi) => {
        const yol = join(klasor, girdi.name);
        if (girdi.isDirectory()) return adresDosyalari(yol);
        return girdi.name === "route.ts" ? [yol] : [];
      })
    : [];

const uygulamadakiUclar = await Promise.all(
  adresDosyalari(adresKlasoru).map(async (dosya) => {
    const parcalar = relative(adresKlasoru, join(dosya, "..")).split(sep);
    const modul: Record<string, unknown> = await import(dosya);
    return yontemler
      .filter((yontem) => yontem in modul)
      .map((yontem) => ({
        baslik: `${yontem} /kapi/${parcalar.join("/")}`,
        giris: parcalar[0],
        uc: modul[yontem] as Partial<Uc>,
      }));
  }),
).then((listeler) => listeler.flat());

const belgedekiBasliklar = [...belge.matchAll(/^### (\S+ \/kapi\/\S+)$/gm)].map(
  (eslesme) => eslesme[1],
);

describe("uç belgesi", () => {
  it("uygulamada en az bir kapı adresi var", () => {
    expect(uygulamadakiUclar.length).toBeGreaterThan(0);
  });

  for (const { baslik, giris, uc } of uygulamadakiUclar) {
    it(`${baslik} kayıtlı bir girişte, uç tanımıyla yazılmış ve belgede yazıyor`, () => {
      expect(kapilar).toContain(giris);
      expect(uc.tanim?.giris).toBe(giris);
      expect(belgedekiBasliklar).toContain(baslik);
    });
  }

  it("belgedeki her adres uygulamada var", () => {
    expect(belgedekiBasliklar.toSorted()).toEqual(
      uygulamadakiUclar.map(({ baslik }) => baslik).toSorted(),
    );
  });
});
