// Posta adresinin tek satırlık yazısı (kart 0214'ten taşındı, kart 0234): açık adres, posta kodu, "ilçe / il" (listenin
// adlarıyla, kodla değil), ülke. Ülkenin adı sitenin biçimleyicisinden gelir; boş parça yazılmaz. Sipariş alındı
// sayfası ve panelin sipariş ayrıntısı bunu kullanır.
import { ilAdi, ilceAdi } from "./bolgeler.ts";

export type YazilacakAdres = {
  ulke: string;
  il?: string | undefined;
  ilce?: string | undefined;
  adres: string;
  postaKodu?: string | undefined;
};

export const adresYazisi = (adres: YazilacakAdres, ulkeAdi: (kod: string) => string): string =>
  [
    adres.adres,
    adres.postaKodu,
    [
      adres.ilce === undefined ? undefined : ilceAdi(adres.ilce),
      adres.il === undefined ? undefined : ilAdi(adres.il),
    ]
      .filter((parca) => parca !== undefined)
      .join(" / "),
    ulkeAdi(adres.ulke),
  ]
    .filter((parca) => parca !== undefined && parca !== "")
    .join(", ");
