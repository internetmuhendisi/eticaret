// Odaklanan öğe sabit alt çubuğun arkasında kalmaz (kart 0188, WCAG 2.4.11): kabın içinde Tab ile baştan sona
// gidilir, her odakta öğenin çubuğun üstünde (çubukla çakışmadan) göründüğü ölçülür. Çubuğun kendi düğmeleri
// sayılmaz. Dönen liste çubuğun arkasında kalan öğelerdir (boşsa tamam).
import type { Locator, Page } from "@playwright/test";

export const odakCubuktaGizlenenler = async (
  page: Page,
  kap: Locator,
  enCokAdim = 80,
): Promise<string[]> => {
  const gizlenenler: string[] = [];
  const gorulen = new Set<string>();
  for (let adim = 0; adim < enCokAdim; adim += 1) {
    await page.keyboard.press("Tab");
    const sonuc = await kap.evaluate((kapOgesi) => {
      const oge = document.activeElement;
      if (!(oge instanceof HTMLElement) || !kapOgesi.contains(oge)) return { durum: "disarida" };
      const cubuk = kapOgesi.querySelector('[data-slot="yan-pencere-alt-cubugu"]');
      if (cubuk === null) return { durum: "cubuk-yok" };
      // Öğenin adı ve yeri: aynı öğeye dönülünce (pencerenin odak döngüsü) ölçüm biter.
      const sira = Array.from(kapOgesi.querySelectorAll("*")).indexOf(oge);
      const ad = `${oge.getAttribute("aria-label") || oge.id || oge.tagName}#${sira}`;
      if (cubuk.contains(oge)) return { durum: "cubukta", ad };
      const o = oge.getBoundingClientRect();
      const c = cubuk.getBoundingClientRect();
      // Görünür alanda olmayan öğe (tarayıcı kaydırmadıysa) da gizlenmiş sayılır.
      const gizli = o.bottom > c.top + 0.5 || o.top < 0 || o.bottom > window.innerHeight;
      return {
        durum: gizli ? "gizli" : "gorunur",
        ad,
        yer: `${oge.tagName}, alt ${Math.round(o.bottom)}, çubuk ${Math.round(c.top)}`,
      };
    });
    if (sonuc.durum === "disarida" || sonuc.durum === "cubuk-yok") break;
    const ad = sonuc.ad ?? "";
    if (gorulen.has(ad)) break;
    gorulen.add(ad);
    if (sonuc.durum === "gizli") gizlenenler.push(`${ad} (${sonuc.yer ?? ""})`);
  }
  return gizlenenler;
};
