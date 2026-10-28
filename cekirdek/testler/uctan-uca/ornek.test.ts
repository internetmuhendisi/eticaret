// Örnek tarayıcı testi: Playwright'ın kurulu olduğunu ve tarayıcıda tıklayabildiğini gösterir.
// Gerçek sayfa henüz yok (kart 0009), bu yüzden test küçük bir sayfayı kendisi kurar.
// İlk gerçek tarayıcı testi yazılınca bu dosya silinir.
import { expect, test } from "@playwright/test";

const sayfa = `
  <p id="sayac">0</p>
  <button type="button" onclick="sayac.textContent = Number(sayac.textContent) + 1">artir</button>
`;

test("düğmeye tıklanınca sayaç artar", async ({ page }) => {
  await page.setContent(sayfa);
  await page.getByRole("button", { name: "artir" }).click();
  await expect(page.locator("#sayac")).toHaveText("1");
});
