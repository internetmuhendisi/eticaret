// Vitrinde kendi sayfası olan, adres adıyla açılan kayıtların tek kaydı (kart 0135, karar 0103). Vitrinin
// adresleri (cekirdek/vitrin/adresler.ts), eski adreslerin tablosu ve tetikleyicileri (değişiklik 0031) bu
// listeyi kullanır; veritabanındaki kopyanın bununla aynı kaldığını görünürlük testi ölçer.
export const adresliKayitTurleri = ["kategori", "marka", "etiket", "urun"] as const;
export type AdresliKayitTuru = (typeof adresliKayitTurleri)[number];
