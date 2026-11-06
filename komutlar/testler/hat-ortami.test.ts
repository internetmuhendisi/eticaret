// Kontrol hattının ortam hazırlığı (kart 0042). .env.example'a eklenen anahtarı hat da üretmeli; hat bunu
// ancak gönderimden sonra söylerdi, bu test göndermeden önce yakalar. Gerçek komut geçici bir kopyada,
// .env'siz çalıştırılır.
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseEnv } from "node:util";
import { afterAll, describe, expect, it } from "vitest";

const kok = join(import.meta.dirname, "..", "..");

// Komut kendi klasörüne göre çalışır; proje kopyalanır, paketler bağlanır.
const kopyalar: string[] = [];
afterAll(() => {
  for (const kopya of kopyalar) rmSync(kopya, { recursive: true, force: true });
});

const kopyaHazirla = (): string => {
  const kopya = mkdtempSync(join(tmpdir(), "hat-ortami-"));
  kopyalar.push(kopya);
  for (const yol of ["komutlar/hat-ortami-hazirla.mts", "cekirdek", "siteler", "package.json"]) {
    cpSync(join(kok, yol), join(kopya, yol), {
      recursive: true,
      filter: (kaynak) => !kaynak.includes("node_modules") && !kaynak.includes(".next"),
    });
  }
  symlinkSync(join(kok, "node_modules"), join(kopya, "node_modules"));
  return kopya;
};

const calistir = (kopya: string) =>
  spawnSync(process.execPath, ["komutlar/hat-ortami-hazirla.mts"], {
    cwd: kopya,
    encoding: "utf8",
  });

describe("hat ortamı", () => {
  it("projedeki .env.example'ın her anahtarını üretiyor", () => {
    const kopya = kopyaHazirla();
    const ornek = readFileSync(join(kok, ".env.example"), "utf8");
    writeFileSync(join(kopya, ".env.example"), ornek);
    const sonuc = calistir(kopya);
    expect(sonuc.stderr).toBe("");
    expect(sonuc.status).toBe(0);
    const uretilen = parseEnv(readFileSync(join(kopya, ".env"), "utf8"));
    expect(Object.keys(uretilen).sort()).toEqual(Object.keys(parseEnv(ornek)).sort());
  });

  it("üretmediği anahtarı reddediyor", () => {
    const kopya = kopyaHazirla();
    const ornek = readFileSync(join(kok, ".env.example"), "utf8");
    writeFileSync(join(kopya, ".env.example"), `${ornek}\nYENI_ANAHTAR=\n`);
    const sonuc = calistir(kopya);
    expect(sonuc.status).toBe(1);
    expect(sonuc.stderr).toContain("YENI_ANAHTAR");
  });
});
