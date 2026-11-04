// Açılış kontrolü: site okunamazsa sebep ölümcül seviyede günlüğe yazılır ve süreç kapanır
// (kart 0035, karar 0026).
import { afterEach, describe, expect, it, vi } from "vitest";
import { siteyiAcilistaDogrula } from "../acilis.ts";

const hataCiktisiniYakala = () => {
  const satirlar: Record<string, unknown>[] = [];
  vi.spyOn(process.stderr, "write").mockImplementation((parca) => {
    satirlar.push(JSON.parse(String(parca)));
    return true;
  });
  return satirlar;
};

describe("açılış kontrolü", () => {
  afterEach(() => vi.restoreAllMocks());

  it("site okunursa uygulama açılır", () => {
    const kapat = vi.fn();
    expect(siteyiAcilistaDogrula({ siteyiOku: () => ({}), kapat })).toBe(true);
    expect(kapat).not.toHaveBeenCalled();
  });

  it("site okunamazsa sebebi ölümcül seviyede yazar ve süreci 1 koduyla kapatır", () => {
    const satirlar = hataCiktisiniYakala();
    const kapat = vi.fn();
    const sonuc = siteyiAcilistaDogrula({
      siteyiOku: () => {
        throw new Error("Site klasörü geçersiz");
      },
      kapat,
    });
    expect(sonuc).toBe(false);
    expect(kapat).toHaveBeenCalledWith(1);
    expect(satirlar[0]).toMatchObject({
      seviye: "olumcul",
      mesaj: "site açılamadı",
      alanlar: { hata: { mesaj: "Site klasörü geçersiz" } },
    });
  });
});
