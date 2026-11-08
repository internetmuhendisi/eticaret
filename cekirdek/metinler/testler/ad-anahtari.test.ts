// Ad anahtarı (kart 0078, karar 0064) gerçek veritabanıyla: büyük küçük harf ve noktalı noktasız i
// ayrımı yapılmaz, öteki harfler ayrı kalır. Türkçe harflerin küçülmesi veritabanının harf ayarına
// bağlıdır; ayar bozulursa bu test kırmızıya düşer.
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import { adAnahtariSql } from "../ad-anahtari.ts";

let vt: Veritabani;
let sil: () => Promise<void>;
beforeAll(async () => {
  ({ vt, sil } = await denemeSitesiAc("ad-anahtari"));
});
afterAll(() => sil());

const anahtar = async (ad: string) =>
  (await vt.execute<{ anahtar: string }>(sql`select ${adAnahtariSql(ad)} as anahtar`)).rows[0]
    ?.anahtar;

describe("ad anahtarı", () => {
  it.each([
    ["Şık", "ŞIK", "şik"],
    ["Deniz", "DENİZ", "deniz"],
    ["ılık", "ILIK", "ilik"],
    ["Çağ Öğün Üç", "ÇAĞ ÖĞÜN ÜÇ", "çağ öğün üç"],
    ["Crème", "CRÈME", "crème"],
  ])("%s ile %s aynı anahtarı verir", async (bir, iki, beklenen) => {
    expect(await anahtar(bir)).toBe(beklenen);
    expect(await anahtar(iki)).toBe(beklenen);
  });

  it("öteki harfler ayrı kalır: ş ile s, ç ile c, ö ile o", async () => {
    for (const [bir, iki] of [
      ["Şık", "Sik"],
      ["Çam", "Cam"],
      ["Öz", "Oz"],
    ] as const) {
      expect(await anahtar(bir)).not.toBe(await anahtar(iki));
    }
  });
});
