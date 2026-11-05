// Gizli bilgi önce sunucudaki dosyadan, yoksa ortam değişkeninden okunur (kart 0019, karar 0031).
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { gizliBilgi } from "../gizli-bilgi.ts";

const klasor = mkdtempSync(join(tmpdir(), "gizli-bilgi-"));
const dosya = (ad: string, icerik: string): string => {
  const yol = join(klasor, ad);
  writeFileSync(yol, icerik);
  return yol;
};
// İşlev değeri olduğu gibi döndürür; biçimi önemli değildir.
const dosyadaki = "dosyadaki-deger";
const ortamdaki = "ortamdaki-deger";

describe("gizli bilgi", () => {
  afterEach(() => vi.unstubAllEnvs());
  afterAll(() => rmSync(klasor, { recursive: true }));

  it("dosya verilmişse dosyadan okur, sondaki satır sonunu atar", () => {
    vi.stubEnv("VERITABANI_ADRESI_DOSYASI", dosya("adres", `${dosyadaki}\n`));
    vi.stubEnv("VERITABANI_ADRESI", ortamdaki);
    expect(gizliBilgi("VERITABANI_ADRESI")).toBe(dosyadaki);
  });

  it("dosya verilmemişse ortam değişkeninden okur", () => {
    vi.stubEnv("VERITABANI_ADRESI_DOSYASI", "");
    vi.stubEnv("VERITABANI_ADRESI", ortamdaki);
    expect(gizliBilgi("VERITABANI_ADRESI")).toBe(ortamdaki);
  });

  it("dosya boşsa durur, ortam değişkenine düşmez", () => {
    vi.stubEnv("VERITABANI_ADRESI_DOSYASI", dosya("bos", "\n"));
    vi.stubEnv("VERITABANI_ADRESI", ortamdaki);
    expect(() => gizliBilgi("VERITABANI_ADRESI")).toThrow("VERITABANI_ADRESI dosyası boş");
  });

  it("dosya okunamazsa durur", () => {
    vi.stubEnv("VERITABANI_ADRESI_DOSYASI", join(klasor, "olmayan"));
    expect(() => gizliBilgi("VERITABANI_ADRESI")).toThrow("VERITABANI_ADRESI dosyası okunamadı");
  });

  it("hiçbiri yoksa durur", () => {
    vi.stubEnv("VERITABANI_ADRESI_DOSYASI", "");
    vi.stubEnv("VERITABANI_ADRESI", "");
    expect(() => gizliBilgi("VERITABANI_ADRESI")).toThrow("VERITABANI_ADRESI yok");
  });

  it("hata iletisi değeri içermez", () => {
    // Okunabilen ama boş olmayan bir dosya hata vermez; değer yalnız dönüşte bulunur.
    // Okunamayan dosyada ileti yalnız yolu söyler.
    vi.stubEnv("VERITABANI_ADRESI_DOSYASI", join(klasor, "olmayan"));
    vi.stubEnv("VERITABANI_ADRESI", ortamdaki);
    try {
      gizliBilgi("VERITABANI_ADRESI");
    } catch (hata) {
      expect(String((hata as Error).message)).not.toContain("ortamdaki-deger");
    }
  });
});
