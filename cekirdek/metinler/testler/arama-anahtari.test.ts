// Aramanın harf kuralı gerçek veritabanıyla (kart 0137): tablodaki her harf, büyük ve küçük yazılışıyla, uygulamada
// ve veritabanında aynı karşılığa iner; Türkçe harfsiz ve büyük harfli yazılış aynı anahtarı verir; tablo dışındaki
// harfler yalnız küçülür; ayrışmış yazılış (NFD) uygulamada birleşik yazılışla aynıdır.
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import { aramaAnahtari, aramaAnahtariSql, aramaHarfleri } from "../arama-anahtari.ts";

let vt: Veritabani;
let sil: () => Promise<void>;
beforeAll(async () => {
  ({ vt, sil } = await denemeSitesiAc("arama-anahtari"));
});
afterAll(() => sil());

const veritabaninda = async (metin: string) =>
  (
    await vt.execute<{ anahtar: string }>(
      sql`select ${aramaAnahtariSql(sql`${metin}::text`)} as anahtar`,
    )
  ).rows[0]?.anahtar;

describe("arama anahtarı", () => {
  it("tablodaki her harf uygulamada ve veritabanında aynı karşılığa iner", async () => {
    for (const [harf, karsilik] of aramaHarfleri) {
      expect(aramaAnahtari(harf), harf).toBe(karsilik);
      expect(await veritabaninda(harf), harf).toBe(karsilik);
    }
  });

  it.each([
    ["gomlek", "Gömlek", "GÖMLEK"],
    ["sisli", "Şişli", "ŞİŞLİ"],
    ["igne", "İğne", "IĞNE"],
    ["ucak", "Uçak", "UÇAK"],
    ["isik", "Işık", "ışık"],
    ["kagit", "Kâğıt", "KÂĞIT"],
    ["miras", "Mîras", "MÎRAS"],
    ["ruzgar", "Rûzgâr", "RÛZGÂR"],
  ])("%s, %s ve %s aynı anahtardır, uygulamada ve veritabanında", async (sade, turkce, buyuk) => {
    for (const yazilis of [sade, turkce, buyuk]) {
      expect(aramaAnahtari(yazilis), yazilis).toBe(sade);
      expect(await veritabaninda(yazilis), yazilis).toBe(sade);
    }
  });

  it("tablo dışındaki harfler yalnız küçülür; boşluklar teke iner; ayrışmış yazılış birleşiğe iner", async () => {
    expect(aramaAnahtari("Crème BRÛLÉE")).toBe("crème brulée");
    expect(await veritabaninda("Crème BRÛLÉE")).toBe("crème brulée");
    expect(aramaAnahtari("  keten \t gomlek  ")).toBe("keten gomlek");
    expect(aramaAnahtari("Gömlek".normalize("NFD"))).toBe("gomlek");
    expect(aramaAnahtari("ORN-GYM-003")).toBe("orn-gym-003");
  });
});
