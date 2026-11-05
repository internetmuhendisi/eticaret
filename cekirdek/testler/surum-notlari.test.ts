// Çekirdeğin sürüm notları (kart 0023, cekirdek/surum-notlari/README.md). Çalışan sürümün ve
// sitelerin kimliklerindeki her sürümün notu olmalı; her not aynı başlıkları aynı sırayla taşır.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { siteKlasorunuOku } from "../ayar-semasi/site-klasoru.ts";
import { cekirdekSurumu } from "../surum.ts";

const kok = join(import.meta.dirname, "..", "..");
const notKlasoru = join(kok, "cekirdek", "surum-notlari");
const surumBicimi = /^\d+\.\d+\.\d+$/;

const notlar = readdirSync(notKlasoru)
  .filter((ad) => ad.endsWith(".md") && ad !== "README.md")
  .map((ad) => ad.slice(0, -".md".length));

const siteSurumleri = readdirSync(join(kok, "siteler"), { withFileTypes: true })
  .filter((girdi) => girdi.isDirectory())
  .map((girdi) => siteKlasorunuOku(join(kok, "siteler", girdi.name)).kimlik)
  .map((kimlik) => [kimlik.kodAdi, kimlik.cekirdekSurumu] as const);

// Notun başlıkları, sırasıyla. Biçimi README.md anlatır.
const notBasliklariHatalari = (surum: string, metin: string): string[] => {
  const basliklar = metin.split("\n").filter((satir) => /^#{1,2} /.test(satir));
  const beklenen = [
    `# ${surum}`,
    "## Tarih",
    "## Güvenlik",
    "## Değişenler",
    "## Sitelere etkisi",
    "## Veritabanı değişiklikleri",
  ];
  const hatalar: string[] = [];
  if (JSON.stringify(basliklar) !== JSON.stringify(beklenen)) {
    hatalar.push(`başlıklar ${basliklar.join(" | ")}, beklenen ${beklenen.join(" | ")}`);
  }
  // Her başlığın altı dolu olmalı.
  const bolumler = metin.split(/^## .*$/m).slice(1);
  bolumler.forEach((bolum, sira) => {
    if (!bolum.trim()) hatalar.push(`${beklenen[sira + 1] ?? "bölüm"} boş`);
  });
  const tarih = metin.match(/^## Tarih\s+(\S+)/m)?.[1] ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tarih)) hatalar.push(`tarih ${tarih || "yok"}`);
  return hatalar;
};

describe("sürüm notları", () => {
  it("çalışan sürüm büyük.orta.küçük biçiminde ve satışa hazır olana kadar 0. ile başlar", () => {
    expect(cekirdekSurumu).toMatch(surumBicimi);
    expect(cekirdekSurumu.startsWith("0.")).toBe(true);
  });

  it("çalışan sürümün notu var", () => {
    expect(existsSync(join(notKlasoru, `${cekirdekSurumu}.md`))).toBe(true);
  });

  it.each(siteSurumleri)("%s sitesinin kimliğindeki sürümün (%s) notu var", (_site, surum) => {
    expect(notlar).toContain(surum);
  });

  it.each(notlar)("%s notu biçime uyuyor", (surum) => {
    expect(surum).toMatch(surumBicimi);
    expect(
      notBasliklariHatalari(surum, readFileSync(join(notKlasoru, `${surum}.md`), "utf8")),
    ).toEqual([]);
  });

  it.each([
    ["başlık eksik", "# 0.1.0\n\n## Tarih\n\n2026-11-05\n\n## Değişenler\n\nx\n"],
    [
      "başlık sırası bozuk",
      "# 0.1.0\n\n## Tarih\n\n2026-11-05\n\n## Değişenler\n\nx\n\n## Güvenlik\n\nx\n\n## Sitelere etkisi\n\nx\n\n## Veritabanı değişiklikleri\n\nx\n",
    ],
    [
      "boş bölüm",
      "# 0.1.0\n\n## Tarih\n\n2026-11-05\n\n## Güvenlik\n\n## Değişenler\n\nx\n\n## Sitelere etkisi\n\nx\n\n## Veritabanı değişiklikleri\n\nx\n",
    ],
    [
      "başka sürümün başlığı",
      "# 0.2.0\n\n## Tarih\n\n2026-11-05\n\n## Güvenlik\n\nx\n\n## Değişenler\n\nx\n\n## Sitelere etkisi\n\nx\n\n## Veritabanı değişiklikleri\n\nx\n",
    ],
    [
      "tarihsiz",
      "# 0.1.0\n\n## Tarih\n\nyakında\n\n## Güvenlik\n\nx\n\n## Değişenler\n\nx\n\n## Sitelere etkisi\n\nx\n\n## Veritabanı değişiklikleri\n\nx\n",
    ],
  ])("bozuk not yakalanır: %s", (_ad, metin) => {
    expect(notBasliklariHatalari("0.1.0", metin)).not.toEqual([]);
  });
});
