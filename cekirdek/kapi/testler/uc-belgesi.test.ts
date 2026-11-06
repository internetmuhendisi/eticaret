// Uygulamadaki her kapı adresi uç belgesinde yazar, belgedeki her adres uygulamada vardır
// (.claude/rules/sunucu-arayuzu.md). Uç listesi uygulamanın adres dosyalarından okunur.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { kapilar } from "../../kayitlar/kapi.ts";
import { uclariOku, uygulamaAdresleri } from "./erisim-denemesi.ts";

const belge = readFileSync(join(import.meta.dirname, "..", "uclar.md"), "utf8");
const uygulamadakiUclar = await uclariOku(uygulamaAdresleri);

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
