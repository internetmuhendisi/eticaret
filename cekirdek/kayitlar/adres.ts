// Vitrinde kendi sayfası olan, adres adıyla açılan kayıtların tek kaydı (kart 0135, karar 0103). Vitrinin
// adresleri (cekirdek/vitrin/adresler.ts), eski adreslerin tablosu ve tetikleyicileri (değişiklik 0031) bu
// listeyi kullanır; veritabanındaki kopyanın bununla aynı kaldığını görünürlük testi ölçer.
// Kart 0272: blog yazısı (/blog/<adres adı>). Kart 0273: sabit sayfa (/sayfa/<adres adı>).
export const adresliKayitTurleri = [
  "kategori",
  "marka",
  "etiket",
  "urun",
  "blog-yazisi",
  "sayfa",
] as const;
export type AdresliKayitTuru = (typeof adresliKayitTurleri)[number];
