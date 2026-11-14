// Bir yazının satırlarının kabın sol kenarına uzaklığı (kart 0130). Yazı birden çok satıra inince her satır
// ayrı ölçülür: sola yaslı yazıda hepsi 0'dır, ortalı yazıda kısa satır içeride başlar.
import type { Locator } from "@playwright/test";

export const satirlarinSolu = (yazi: Locator, kapSecicisi: string): Promise<number[]> =>
  yazi.evaluate((oge, secici) => {
    const kap = oge.closest(secici);
    if (kap === null) throw new Error(`${secici} bulunamadı`);
    const sol = kap.getBoundingClientRect().left;
    const aralik = document.createRange();
    aralik.selectNodeContents(oge);
    return [...aralik.getClientRects()].map((satir) => Math.round(satir.left - sol));
  }, kapSecicisi);
