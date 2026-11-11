// Arama sayfasının istek sınırı başlığı (kart 0137): ara katman (cekirdek/uygulama/proxy.ts) sınır aşılınca bekleme
// süresini bu başlıkla sayfaya verir, sayfa arama yapmadan "biraz bekleyin" der. Dışarıdan gelen aynı adlı başlık
// ara katmanda silinir.
export const aramaSiniriBasligi = "x-arama-bekle";
