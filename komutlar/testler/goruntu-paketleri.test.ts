// Görüntüdeki tek dosyalık paketler (kart 0340): Dockerfile'daki her esbuild komutu dosyadan okunup aynen kurulur, çıktı
// geçici klasöre yönlendirilir ve Node'un sözdizimi denetiminden geçer. Paketin başına eklenen satır ile pakete gömülen
// bir kütüphanenin aynı adı içe aktarması (fflate'in createRequire'ı) modülü açılmaz yapar; arka plan kutusu nabız
// yazamaz, sağlıksız kalır. Bunu yalnız yerel ortam denemesi (hattın sonu) yakalıyordu.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, onTestFinished } from "vitest";

const kok = join(import.meta.dirname, "..", "..");
const dockerfile = readFileSync(join(kok, "sunucu", "cekirdek", "Dockerfile"), "utf8");

// Kabuk sözcüklerine ayırır: çift ve tek tırnak, ters bölü ile devam eden satırlar.
const sozcukler = (komut: string): string[] => {
  const sonuc: string[] = [];
  let simdiki = "";
  let var_ = false;
  let tirnak: '"' | "'" | null = null;
  for (const harf of komut.replaceAll("\\\n", " ")) {
    if (tirnak !== null) {
      if (harf === tirnak) tirnak = null;
      else simdiki += harf;
    } else if (harf === '"' || harf === "'") {
      tirnak = harf;
      var_ = true;
    } else if (/\s/.test(harf)) {
      if (var_) sonuc.push(simdiki);
      simdiki = "";
      var_ = false;
    } else {
      simdiki += harf;
      var_ = true;
    }
  }
  if (var_) sonuc.push(simdiki);
  return sonuc;
};

// Dockerfile'daki esbuild komutlarının argümanları (RUN satırı devamlarıyla birlikte; `&&` ile başlayan sonraki komut
// esbuild'in değildir).
const esbuildKomutlari = (metin: string): string[][] =>
  [...metin.matchAll(/^RUN pnpm exec esbuild ((?:.*\\\n)*.*)$/gm)].map((eslesme) => {
    const hepsi = sozcukler(eslesme[1] ?? "");
    const son = hepsi.indexOf("&&");
    return son === -1 ? hepsi : hepsi.slice(0, son);
  });

const komutlar = esbuildKomutlari(dockerfile);

describe("görüntünün paketleri", () => {
  it("Dockerfile'da paket komutları bulunur", () => {
    expect(komutlar.length).toBeGreaterThanOrEqual(4);
    expect(komutlar.some((k) => k.includes("cekirdek/arka-plan-isleri/surec.ts"))).toBe(true);
  });

  it.each(komutlar.map((komut) => [komut.find((a) => a.endsWith(".ts")) ?? "", komut]))(
    "%s kurulup Node'un sözdizimi denetiminden geçer",
    (_ad, komut) => {
      const klasor = mkdtempSync(join(tmpdir(), "goruntu-paketi-"));
      onTestFinished(() => rmSync(klasor, { recursive: true, force: true }));
      const argumanlar = komut.map((arguman) =>
        arguman
          .replace(
            /^--outfile=\/kaynak\/(.*)$/,
            (_t, yol: string) => `--outfile=${join(klasor, yol)}`,
          )
          .replace(
            /^--outdir=\/kaynak\/(.*)$/,
            (_t, yol: string) => `--outdir=${join(klasor, yol)}`,
          ),
      );
      const kurulum = spawnSync("pnpm", ["exec", "esbuild", ...argumanlar], {
        cwd: kok,
        encoding: "utf8",
      });
      expect(kurulum.status, kurulum.stderr).toBe(0);
      const dosyalar = readdirSync(klasor, { recursive: true, encoding: "utf8" })
        .filter((ad) => ad.endsWith(".mjs"))
        .map((ad) => join(klasor, ad));
      expect(dosyalar.length).toBeGreaterThan(0);
      for (const dosya of dosyalar) {
        const denetim = spawnSync(process.execPath, ["--check", dosya], { encoding: "utf8" });
        expect(denetim.status, `${dosya}\n${denetim.stderr}`).toBe(0);
      }
    },
    120_000,
  );

  it("sözcüklere ayırma tırnakları ve satır devamını tanır, komut && ile biter", () => {
    expect(sozcukler(`a --b="x 'y' z" \\\n  --c=d`)).toEqual(["a", "--b=x 'y' z", "--c=d"]);
    expect(esbuildKomutlari("RUN pnpm exec esbuild a.ts --x=1 \\\n    && cp -R b c\n")).toEqual([
      ["a.ts", "--x=1"],
    ]);
  });
});
