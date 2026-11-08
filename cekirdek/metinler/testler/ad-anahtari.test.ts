// Ad anahtarı (kart 0078, karar 0064): uygulama ve veritabanı aynı adlar için aynı anahtarı üretir,
// büyük küçük harf ve noktalı noktasız i ayrımı yapılmaz, öteki harfler ayrı kalır.
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import { adAnahtari, adAnahtariSql } from "../ad-anahtari.ts";

let vt: Veritabani;
let sil: () => Promise<void>;
beforeAll(async () => {
  ({ vt, sil } = await denemeSitesiAc("ad-anahtari"));
});
afterAll(() => sil());

const veritabanindaki = async (ad: string) =>
  (await vt.execute<{ anahtar: string }>(sql`select ${adAnahtariSql(ad)} as anahtar`)).rows[0]
    ?.anahtar;

describe("ad anahtarı", () => {
  it.each([
    ["Şık", "ŞIK", "şik"],
    ["Deniz", "DENİZ", "deniz"],
    ["ılık", "ILIK", "ilik"],
    ["Çağ Öğün Üç", "ÇAĞ ÖĞÜN ÜÇ", "çağ öğün üç"],
    ["Crème", "CRÈME", "crème"],
  ])("%s ile %s aynı anahtarı verir (uygulama ve veritabanı)", async (bir, iki, beklenen) => {
    for (const ad of [bir, iki]) {
      expect(adAnahtari(ad)).toBe(beklenen);
      expect(await veritabanindaki(ad)).toBe(adAnahtari(ad));
    }
  });

  it("öteki harfler ayrı kalır: ş ile s, ç ile c, ö ile o", async () => {
    for (const [bir, iki] of [
      ["Şık", "Sik"],
      ["Çam", "Cam"],
      ["Öz", "Oz"],
    ]) {
      expect(adAnahtari(bir ?? "")).not.toBe(adAnahtari(iki ?? ""));
      expect(await veritabanindaki(bir ?? "")).not.toBe(await veritabanindaki(iki ?? ""));
    }
  });
});
