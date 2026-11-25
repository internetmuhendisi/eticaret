// Ortak tarama yardımcısının beklemeleri ve seçenekleri (kart 0288). Sayfalar testin içinde kurulur (setContent),
// uygulamaya istek gitmez. Her bekleme, kaldırılınca bu testi kırmızıya düşürecek bir durumla denenir:
// - Başlık bir an yokken başlayan tarama başlık gelince yapılır (kart 0287'nin hattaki düşüşü).
// - Sürmekte olan renk animasyonu bitmeden tarama yapılmaz (ara renk okunmaz).
// - Sonsuz animasyon beklenmez, tarama takılmaz.
// - haric ve yalniz seçenekleri; ihlalleriBul gerçek ihlali bulur.
import { expect, test } from "@playwright/test";
import { ihlalleriBul, tara } from "./tarama";

const sayfa = (govde: string, stil = "") =>
  `<!doctype html><html lang="tr"><head><title>Deneme</title><style>${stil}</style></head><body><main>${govde}</main></body></html>`;

test("başlık bir an yokken tarama başlığın dönmesini bekler", async ({ page }) => {
  await page.setContent(sayfa("<h1>Başlık</h1>"));
  await page.evaluate(() => {
    const baslik = document.querySelector("title");
    baslik?.remove();
    setTimeout(() => {
      if (baslik !== null && baslik !== undefined) document.head.append(baslik);
    }, 800);
  });
  await tara(page, "başlık geri gelince");
});

test("sürmekte olan renk animasyonu bitince taranır", async ({ page }) => {
  // Yazı okunmaz renkten (gainsboro, beyaz zeminde ~1,4:1) siyaha 1,5 saniyede geçer.
  await page.setContent(
    sayfa(
      '<p class="gecis">Okunur olacak yazı</p>',
      "body{background:white} .gecis{color:black;animation:solma 1.5s linear} @keyframes solma{from{color:gainsboro}to{color:black}}",
    ),
  );
  await tara(page, "animasyon bitince");
});

test("sonsuz animasyon beklenmez", async ({ page }) => {
  await page.setContent(
    sayfa(
      '<p class="donen">Yükleniyor</p>',
      "body{background:white} .donen{color:black;animation:don 1s linear infinite} @keyframes don{to{transform:rotate(360deg)}}",
    ),
  );
  const bas = Date.now();
  await tara(page, "sonsuz animasyonla");
  expect(Date.now() - bas).toBeLessThan(10_000);
});

test("ihlalleriBul gerçek ihlali bulur; haric ve yalniz uyulur", async ({ page }) => {
  await page.setContent(
    sayfa(
      '<section id="iyi"><p>Düz yazı</p></section><section id="kotu"><img src="data:," width="10" height="10"></section>',
    ),
  );
  expect((await ihlalleriBul(page)).map((i) => i.kural)).toContain("image-alt");
  await tara(page, "kötü bölüm hariç", { haric: ["#kotu"] });
  await tara(page, "yalnız iyi bölüm", { yalniz: ["#iyi"] });
});
