// Posta adresinin tek satırlık yazısı (kart 0214'ten taşındı, kart 0234): açık adres, posta kodu, "ilçe / il" (listenin
// adlarıyla, kodla değil), ülke. Ülkenin adı sitenin biçimleyicisinden gelir; boş parça yazılmaz. Sipariş alındı
// sayfası ve panelin sipariş ayrıntısı bunu kullanır. Kural adres-satiri.ts'tedir (tarayıcıdaki adres defteriyle ortak,
// kart 0237).
import { adresSatiri, type YazilacakAdres } from "./adres-satiri.ts";
import { ilAdi, ilceAdi } from "./bolgeler.ts";

export type { YazilacakAdres };

export const adresYazisi = (adres: YazilacakAdres, ulkeAdi: (kod: string) => string): string =>
  adresSatiri(adres, { ulke: ulkeAdi, il: ilAdi, ilce: ilceAdi });
