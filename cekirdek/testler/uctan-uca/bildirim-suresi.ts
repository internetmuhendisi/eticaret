// Taramadan önce bildirimlerin süresini durdurur (kart 0220). Bildirim (sonner) birkaç saniyede kendiliğinden kapanır.
// Süre tarama sürerken dolarsa kapanma geçişindeki yarı saydam yazı kontrastı düşürür; taramanın animasyon beklemesi
// bunu göremez, çünkü geçiş bekleme bittikten sonra başlar. Hatta iki kez bileşen sahnesinde düştü, yerelde bildirimin
// 3,75. saniyesindeki taramada 10/10 kırmızı (aynı ihlal: color-contrast, bildirimin başlığı).
//
// Sonner fare bildirimin üstündeyken süreyi durdurur: fare bildirime getirilir. Bildirim taramada kalır, süresi,
// metni ve yeri değişmez; açılmış (yığılmamış) çizilir, gerçek kullanıcının fare üstündeyken gördüğü hâl. Bildirim
// zaten kapanıyorsa fare gelmeden geçiş başlamıştır ve taramanın animasyon beklemesi onu bekler.
import type { Page } from "@playwright/test";

export const bildirimSuresiniDurdur = async (page: Page): Promise<void> => {
  const bildirim = page.locator("[data-sonner-toast]:not([data-removed='true'])").first();
  if ((await bildirim.count()) === 0) return;
  // Kapanma bu arada başlarsa öğe kalkabilir: o zaman durdurulacak süre yoktur.
  await bildirim.hover({ force: true, timeout: 2_000 }).catch(() => undefined);
  // Süreyi durduran güncelleme React'ın sonraki karesindedir.
  await page.evaluate(
    () => new Promise((bitti) => requestAnimationFrame(() => requestAnimationFrame(bitti))),
  );
};
