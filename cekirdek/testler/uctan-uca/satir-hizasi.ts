// Bir yazının satırlarını ölçen yardımcılar. Yazı birden çok satıra inince her satır ayrı ölçülür.
import type { Locator } from "@playwright/test";

// Satırların kabın sol kenarına uzaklığı (kart 0130): sola yaslı yazıda hepsi 0'dır, ortalı yazıda kısa satır
// içeride başlar.
export const satirlarinSolu = (yazi: Locator, kapSecicisi: string): Promise<number[]> =>
  yazi.evaluate((oge, secici) => {
    const kap = oge.closest(secici);
    if (kap === null) throw new Error(`${secici} bulunamadı`);
    const sol = kap.getBoundingClientRect().left;
    const aralik = document.createRange();
    aralik.selectNodeContents(oge);
    return [...aralik.getClientRects()].map((satir) => Math.round(satir.left - sol));
  }, kapSecicisi);

// Her satırda görünen yazı (kart 0190): her harfin satırı üst kenarından bulunur, aynı satırdakiler birleşir.
// Yalnız ekran okuyucuya yazılan yazı (sr-only) sayılmaz. Satırlar baştaki ve sondaki boşluk atılarak döner.
export const satirlarinYazisi = (yazi: Locator): Promise<string[]> =>
  yazi.evaluate((oge) => {
    const satirlar = new Map<number, string>();
    const yuruyucu = document.createTreeWalker(oge, NodeFilter.SHOW_TEXT);
    for (let dugum = yuruyucu.nextNode(); dugum !== null; dugum = yuruyucu.nextNode()) {
      if (!(dugum instanceof Text) || dugum.parentElement?.closest(".sr-only")) continue;
      for (let i = 0; i < dugum.length; i += 1) {
        const aralik = document.createRange();
        aralik.setStart(dugum, i);
        aralik.setEnd(dugum, i + 1);
        const kutu = aralik.getClientRects()[0];
        if (kutu === undefined) continue;
        const ust = Math.round(kutu.top);
        satirlar.set(ust, (satirlar.get(ust) ?? "") + dugum.data[i]);
      }
    }
    return [...satirlar.entries()].sort(([a], [b]) => a - b).map(([, satir]) => satir.trim());
  });
