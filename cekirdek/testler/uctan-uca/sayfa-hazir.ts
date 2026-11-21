// Tarayıcı testlerinin "sayfa hazır" beklemesi (kart 0121): ağ işi biter ve sayfanın bütün öğeleri tarayıcıda
// React'a bağlanır (hidrasyon). Yalnız ağ işini beklemek yetmez: işlemci 2–5 kat yavaşken ağ işi bittiği anda
// sayfanın öğelerinin çoğu henüz bağlanmamıştı. O anda açılan yan pencere ya da menü, bağlanmamış bölümlere
// aria-hidden yazar; React bölümü bağlarken sunucunun HTML'iyle farkı konsola uyarı olarak yazar ve testin konsol
// denetimi düşer (kontrol hattı, ölçüldü). Beklenince uyarı kalmadı.
//
// Bağlanma, öğenin React'ın iç alanını (__reactFiber...) taşımasıyla ölçülür. Bu React'ın iç adıdır, yalnız testte
// kullanılır: React adı değiştirirse bekleme süresini doldurup kırmızıya düşer, sessizce geçmez. React'ın dışında
// açılan öğeler sayılmaz: Next.js'in betikleri, geliştirme göstergesi ve sayfa duyurucusu; pencere açıkken Radix'in
// sayfanın iki ucuna koyduğu odak koruyucuları; hazır HTML olarak yazılan biçimli metnin içi (ürünün uzun açıklaması,
// `data-slot="bicimli-metin"`, kart 0138): React o öğeleri bağlamaz, kabın kendisi bağlanır; panelin biçimli metin
// alanındaki yazı alanı ve içi (`data-slot="bicimli-metin-alani"`, kart 0263): ProseMirror çizer, kabı React bağlar.
//
// Süre dolunca bekleme bağlanmamış öğeleri adıyla söyler (kart 0252): hattaki bir düşüşte test süresi bitene kadar
// beklemiş, hangi öğenin bağlanmadığı ancak izin sayfa görüntüsü çözülerek bulunabilmişti (önceki sayfanın gövdede
// kalan <title> öğesi). Süre, testin kendi süresinden kısadır ki ileti testin süre aşımından önce gelsin.
import type { Page } from "@playwright/test";

const sayilmayanlar =
  "script, nextjs-portal, next-route-announcer, [data-radix-focus-guard], [data-slot=bicimli-metin] *, [data-slot=bicimli-metin-alani] .ProseMirror, [data-slot=bicimli-metin-alani] .ProseMirror *";

// Sayfada çalışır: React'a bağlanmamış öğelerin kısa tarifi (etiket, kimlik, sınıfın başı, üst öğe, metnin başı).
const baglanmamislar = (sayilmayan: string): string[] =>
  [...document.body.querySelectorAll("*")]
    .filter((oge) => !oge.matches(sayilmayan))
    .filter((oge) => !Object.keys(oge).some((alan) => alan.startsWith("__reactFiber")))
    .map((oge) => {
      const kimlik = oge.id ? `#${oge.id}` : "";
      const sinif = oge.getAttribute("class")?.split(" ").slice(0, 3).join(".") ?? "";
      const ust = oge.parentElement?.tagName.toLowerCase() ?? "-";
      const yazi = (oge.textContent ?? "").trim().slice(0, 40);
      return `${oge.tagName.toLowerCase()}${kimlik}${sinif ? `.${sinif}` : ""} (üst: ${ust}${yazi ? `, "${yazi}"` : ""})`;
    });

export const sayfaHazir = async (
  page: Page,
  { sure = 30_000 }: { sure?: number } = {},
): Promise<void> => {
  await page.waitForLoadState("networkidle");
  const son = Date.now() + sure;
  for (;;) {
    // Sorgu sırasında sayfa değişirse (yönlendirme) bağlam kaybolur: o tur sayılmaz, yeni sayfa sorulur.
    const liste = await page.evaluate(baglanmamislar, sayilmayanlar).catch((hata: unknown) => {
      if (hata instanceof Error && /Execution context was destroyed|navigation/i.test(hata.message))
        return null;
      throw hata;
    });
    if (liste !== null && liste.length === 0) return;
    if (Date.now() >= son) {
      throw new Error(
        liste === null
          ? `Sayfa ${sure} ms içinde React'a bağlanmadı; son sorguda sayfa değişiyordu`
          : `Sayfa ${sure} ms içinde React'a bağlanmadı; bağlanmamış ${liste.length} öğe: ${liste.slice(0, 10).join("; ")}`,
      );
    }
    await page.waitForTimeout(100);
  }
};
