// Yayın denemesinin iki yayını ayırt ettiği işaret (kart 0209): iki logo farklı, ikisi de sitenin ilk
// logosu olarak site doğrulamasından geçer; karar yalnız beklenen logoda evet der, iki logo aynıysa
// hiçbir zaman evet demez (işaret değişmezse ölçüm kırmızı kalır).
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { markaKlasoru, markaLogosunuDogrula } from "../../cekirdek/ayar-semasi/site-klasoru.ts";
import { denemeLogolari, logoYayiniGosteriyor } from "../yayin-denemesi-logosu.mts";

const klasorler: string[] = [];
afterAll(() => {
  for (const klasor of klasorler) rmSync(klasor, { recursive: true, force: true });
});

describe("yayın denemesinin logosu", () => {
  it("iki logo farklı ve ikisi de ilk logo olarak doğrulamadan geçer", async () => {
    const { birinci, ikinci } = await denemeLogolari();
    expect(birinci.equals(ikinci)).toBe(false);
    for (const logo of [birinci, ikinci]) {
      const klasor = mkdtempSync(join(tmpdir(), "yayin-logosu-"));
      klasorler.push(klasor);
      mkdirSync(join(klasor, markaKlasoru));
      writeFileSync(join(klasor, markaKlasoru, "logo.webp"), logo);
      const sonuc = markaLogosunuDogrula(klasor);
      expect(sonuc.gecerli && sonuc.logo?.tur).toBe("webp");
    }
  });

  it("yalnız beklenen yayının logosunda evet der", async () => {
    const { birinci, ikinci } = await denemeLogolari();
    expect(logoYayiniGosteriyor(birinci, birinci, ikinci)).toBe(true);
    expect(logoYayiniGosteriyor(ikinci, ikinci, birinci)).toBe(true);
    expect(logoYayiniGosteriyor(birinci, ikinci, birinci)).toBe(false);
    expect(logoYayiniGosteriyor(Buffer.alloc(0), birinci, ikinci)).toBe(false);
  });

  it("iki yayının logosu aynıysa hiçbir logoda evet demez", async () => {
    const { birinci } = await denemeLogolari();
    expect(logoYayiniGosteriyor(birinci, birinci, Buffer.from(birinci))).toBe(false);
  });
});
