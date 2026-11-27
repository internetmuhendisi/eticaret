// Sunucudaki panel denemesinin açılış sayfası ölçümü (kart 0336): kart 0186'dan beri açılış sayfası panodur, başlığı
// günün selamıdır; deneme "Karşılama"yı beklerse sunucuda kırmızı olur. Deneme sunucuya bağlandığı için içe
// aktarılamaz: kuralı panoBasligiMi ile ölçülür, betiğin onu kullandığı dosyası okunarak denetlenir.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { metinOkuyucu } from "../../cekirdek/metinler/metin.ts";
import {
  panoBasligiMi,
  panoSelamAnahtari,
  panoSelamlari,
} from "../../cekirdek/yonetim-paneli/pano/tanim.ts";
import { selam } from "../../cekirdek/yonetim-paneli/pano/veri.ts";

const metin = metinOkuyucu("tr");

describe("panel denemesinin başlık ölçümü", () => {
  it("üç selamı kabul eder, menüdeki adı ve başka yazıyı reddeder", () => {
    for (const kod of panoSelamlari)
      expect(panoBasligiMi(metin(panoSelamAnahtari(kod)), metin)).toBe(true);
    expect(panoBasligiMi(metin("yonetim.sayfa.karsilama.ad"), metin)).toBe(false);
    expect(panoBasligiMi("", metin)).toBe(false);
    expect(panoBasligiMi(`${metin(panoSelamAnahtari("gunaydin"))} `, metin)).toBe(false);
  });

  it("günün her saatinin selamı kabul edilir", () => {
    for (let saat = 0; saat < 24; saat += 1) {
      const kod = selam(new Date(Date.UTC(2026, 10, 27, saat, 30)), "UTC");
      expect(panoBasligiMi(metin(panoSelamAnahtari(kod)), metin), `${saat}`).toBe(true);
    }
  });

  it("tanım dosyası Node ile doğrudan açılır (betik derlenmeden çalışır)", () => {
    // Vitest yolları kendisi çözer; betik ise `node` ile çalışır, uzantısız değer içe aktarması onu açılmaz yapar.
    const sonuc = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `const m = await import(${JSON.stringify(resolve(import.meta.dirname, "../../cekirdek/yonetim-paneli/pano/tanim.ts"))}); if (typeof m.panoBasligiMi !== "function") process.exit(2);`,
      ],
      { encoding: "utf8" },
    );
    expect(sonuc.status, sonuc.stderr).toBe(0);
  });

  it("betik başlığı panoBasligiMi ile ölçer, eski beklentiyi taşımaz", () => {
    const betik = readFileSync(resolve(import.meta.dirname, "../panel-denemesi.mts"), "utf8");
    expect(betik).toMatch(/olc\(\s*"panelin başlığı görünüyor",\s*panoBasligiMi\(/);
    expect(betik).not.toContain("yonetim.sayfa.karsilama");
  });
});
