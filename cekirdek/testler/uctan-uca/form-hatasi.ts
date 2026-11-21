// Panelin ortak form yapısının (kart 0259) tarayıcıdaki ölçümü: birden çok hatada odak formun başındaki hata
// özetindedir, satırlar alanların ekrandaki sırasıyla yazar ve satır alana götürür.
import { expect, type Locator, type Page } from "@playwright/test";

export const hataOzeti = (kap: Page | Locator): Locator => kap.locator('[data-slot="hata-ozeti"]');

// Özet odakta; ilk satırları verilen sırayla bu yazıları taşır (sayi verilirse satır sayısı da). Dönen özetin
// satırlarıdır.
export const ozetOdaktaOlmali = async (
  kap: Page | Locator,
  satirBaslari: readonly string[],
  sayi?: number,
): Promise<Locator> => {
  const ozet = hataOzeti(kap);
  await expect(ozet).toBeFocused();
  const satirlar = ozet.getByRole("listitem");
  if (sayi !== undefined) await expect(satirlar).toHaveCount(sayi);
  for (const [sira, bas] of satirBaslari.entries()) {
    await expect(satirlar.nth(sira)).toContainText(bas);
  }
  return satirlar;
};
