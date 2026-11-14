// Basılan alanın ölçüsü (kart 0191, 0146): öğenin ortasına ve ortasından dört yöne 21 px uzağa (44 × 44 px karenin
// kenar ortalarının 1 px içi) basılınca o öğeye mi basılıyor? Görünmez genişletilmiş alan (dokunma-alani) da
// sayılır; komşu bir öğe alanın üstüne biniyorsa o noktada komşu çıkar ve ölçüm düşer. Köşelere basılmaz: tarayıcı
// yuvarlak düğmenin köşesini basılan alana saymaz, 44 px'lik yuvarlak düğme de geçmeliydi. Kenardan 1 px içeride
// ölçülür: tarayıcı yuvarlak düğmenin kenarındaki yarım pikseli komşu düğmeye verebiliyor (yan yana iki 44 px'lik
// yuvarlak noktada ölçüldü). Onay kutusu ve radyo yazısıyla birlikte basılır: etiketi ölçülür.
// Ölçüm sayfada tek işlevle yapılır; tek öğe de sayfanın bütün basılabilir öğeleri de onunla ölçülür.
import type { Locator, Page } from "@playwright/test";

export const DOKUNMA_ALANI = 44;

// Sayfanın basılabilir öğeleri. Görünmeyen, inert ya da ekran okuyucudan gizli kapta duranlar sayılmaz.
const basilabilirSecici =
  'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab], [role=checkbox], [role=radio], [role=menuitem], [role=switch], [role=option], [tabindex]:not([tabindex="-1"])';

// Sayfada çalışır: her öğe için öğeye gitmeyen noktaların listesi (boşsa öğe geçer).
const olc = async (
  ogeler: Element[],
  kenar: number,
): Promise<{ ad: string; noktalar: string[] }[]> => {
  const sonuc: { ad: string; noktalar: string[] }[] = [];
  for (const oge of ogeler) {
    // Yalnız sayfanın kendi belgesindeki öğeler: geliştirme sunucusunun araç düğmesi (nextjs-portal) gölge DOM'dadır,
    // canlıda yoktur.
    if (oge.getRootNode() !== document) continue;
    if (oge.closest("[inert], [aria-hidden=true]")) continue;
    const stil = getComputedStyle(oge);
    if (stil.visibility === "hidden" || oge.getClientRects().length === 0) continue;
    let hedef: Element = oge;
    const onay =
      oge.getAttribute("role") === "checkbox" ||
      oge.getAttribute("role") === "radio" ||
      oge.matches("input[type=checkbox], input[type=radio]");
    if (onay) {
      const etiket =
        oge.closest("label") ?? (oge.id ? document.querySelector(`label[for="${oge.id}"]`) : null);
      if (etiket !== null) hedef = etiket;
    }
    hedef.scrollIntoView({ block: "center", inline: "nearest" });
    await new Promise((bitti) => requestAnimationFrame(() => bitti(undefined)));
    const kutu = hedef.getBoundingClientRect();
    if (kutu.width === 0 || kutu.height === 0) continue;
    const ortaX = kutu.left + kutu.width / 2;
    const ortaY = kutu.top + kutu.height / 2;
    const yari = kenar / 2 - 1;
    const noktalar: string[] = [];
    for (const [dx, dy] of [
      [0, 0],
      [-yari, 0],
      [yari, 0],
      [0, -yari],
      [0, yari],
    ] as const) {
      const nokta = document.elementFromPoint(ortaX + dx, ortaY + dy);
      if (nokta === null || !(nokta === hedef || hedef.contains(nokta) || nokta === oge)) {
        noktalar.push(`(${Math.round(dx)}, ${Math.round(dy)}): ${nokta?.tagName ?? "yok"}`);
      }
    }
    const ad = (oge.getAttribute("aria-label") ?? oge.textContent ?? oge.tagName)
      .trim()
      .replace(/\s+/gu, " ")
      .slice(0, 50);
    sonuc.push({
      ad: `${oge.tagName.toLowerCase()} "${ad}" ${Math.round(kutu.width)}×${Math.round(kutu.height)}`,
      noktalar,
    });
  }
  return sonuc;
};

// Tek öğenin öğeye gitmeyen noktaları.
export const basilmayanNoktalar = async (oge: Locator): Promise<string[]> => {
  const [sonuc] = await oge.evaluateAll(olc, DOKUNMA_ALANI);
  return sonuc?.noktalar ?? ["öğe ölçülemedi"];
};

// Sayfanın basılan alanı 44 × 44 px'ten küçük ya da komşusuyla çakışan öğeleri; sayfa sonunda başa kaydırılır.
export const basilmayanOgeler = async (page: Page): Promise<string[]> => {
  const sonuc = await page.locator(basilabilirSecici).evaluateAll(olc, DOKUNMA_ALANI);
  await page.evaluate(() => window.scrollTo(0, 0));
  return sonuc
    .filter(({ noktalar }) => noktalar.length > 0)
    .map(({ ad, noktalar }) => `${ad} [${noktalar.join(" ")}]`);
};
