// Tarayıcı testlerinin "sayfa hazır" beklemesi (kart 0121): ağ işi biter ve sayfanın bütün öğeleri tarayıcıda
// React'a bağlanır (hidrasyon). Yalnız ağ işini beklemek yetmez: işlemci 2–5 kat yavaşken ağ işi bittiği anda
// sayfanın öğelerinin çoğu henüz bağlanmamıştı. O anda açılan yan pencere ya da menü, bağlanmamış bölümlere
// aria-hidden yazar; React bölümü bağlarken sunucunun HTML'iyle farkı konsola uyarı olarak yazar ve testin konsol
// denetimi düşer (kontrol hattı, ölçüldü). Beklenince uyarı kalmadı.
//
// Bağlanma, öğenin React'ın iç alanını (__reactFiber...) taşımasıyla ölçülür. Bu React'ın iç adıdır, yalnız testte
// kullanılır: React adı değiştirirse bekleme süresini doldurup kırmızıya düşer, sessizce geçmez. React'ın dışında
// açılan öğeler sayılmaz: Next.js'in betikleri, geliştirme göstergesi ve sayfa duyurucusu; pencere açıkken Radix'in
// sayfanın iki ucuna koyduğu odak koruyucuları.
import type { Page } from "@playwright/test";

export const sayfaHazir = async (page: Page): Promise<void> => {
  await page.waitForLoadState("networkidle");
  await page.waitForFunction(() =>
    [...document.body.querySelectorAll("*")]
      .filter(
        (oge) =>
          !oge.matches("script, nextjs-portal, next-route-announcer, [data-radix-focus-guard]"),
      )
      .every((oge) => Object.keys(oge).some((alan) => alan.startsWith("__reactFiber"))),
  );
};
