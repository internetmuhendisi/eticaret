// Yayın komutunun sitenin demo paketini site klasörüyle aynı kayıttan çıkarması (kart 0345, karar 0203): paket site
// klasörünün iki üstündeki cekirdek/demolar altına gelir, site doğrulaması ve yayının yüklemesi onu orada bulur.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { siteKlasorunuDogrula } from "../../cekirdek/ayar-semasi/site-klasoru.ts";
import { kok } from "../sunucu.mts";
import { kayittanSiteKlasoru } from "../yayin-hazirligi.mts";

const kayit = spawnSync("git", ["-C", kok, "rev-parse", "HEAD"], {
  encoding: "utf8",
}).stdout.trim();
const geciciler: string[] = [];
afterAll(() => {
  for (const klasor of geciciler) rmSync(klasor, { recursive: true, force: true });
});

describe("kayıttan çıkarılan site klasörü ve paketi", () => {
  it.each([["siteler/ornek-magaza"], ["siteler/tema-galerisi"]])(
    "%s: yalnız sitenin paketi yanında çıkar, site doğrulamadan geçer",
    (klasor) => {
      const yerel = kayittanSiteKlasoru(kayit, klasor);
      geciciler.push(dirname(dirname(yerel)));
      const demolar = join(yerel, "..", "..", "cekirdek", "demolar");
      expect(readdirSync(demolar)).toEqual(["demo1"]);
      expect(existsSync(join(demolar, "demo1", "baslangic", "katalog.json"))).toBe(true);
      const sonuc = siteKlasorunuDogrula(yerel);
      expect(sonuc.gecerli ? [] : sonuc.hatalar).toEqual([]);
    },
  );
});
