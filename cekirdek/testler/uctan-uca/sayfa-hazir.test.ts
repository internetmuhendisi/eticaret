// "Sayfa hazır" beklemesinin teşhisi (kart 0252): sayfa süre içinde bağlanmazsa ileti bağlanmamış öğeyi adıyla
// söyler. Bilerek bağlanmamış öğe, React'ın bağladığı bir sayfanın gövdesine sonradan eklenir.
import { expect, test } from "@playwright/test";
import { sayfaHazir } from "./sayfa-hazir";

test("sayfa hazır: bağlanmış sayfada biter, bağlanmamış öğeyi süre dolunca adıyla söyler", async ({
  page,
}) => {
  await page.goto("/yonetim/giris");
  await sayfaHazir(page);
  await page.evaluate(() => {
    const oge = document.createElement("div");
    oge.id = "bilerek-baglanmamis";
    oge.className = "deneme-sinifi";
    oge.textContent = "React dışında eklendi";
    document.body.append(oge);
  });
  const hata = await sayfaHazir(page, { sure: 1_000 }).then(
    () => null,
    (e: unknown) => (e instanceof Error ? e.message : String(e)),
  );
  expect(hata).toContain("bağlanmamış 1 öğe");
  expect(hata).toContain(
    'div#bilerek-baglanmamis.deneme-sinifi (üst: body, "React dışında eklendi")',
  );
});
