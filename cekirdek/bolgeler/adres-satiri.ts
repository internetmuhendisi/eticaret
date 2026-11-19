// Posta adresinin tek satırlık yazısının kuralı (kart 0234; kart 0237 ile adres-yazisi.ts'ten ayrıldı): açık adres,
// posta kodu, "ilçe / il", ülke; boş parça yazılmaz. Adları çağıran verir: sunucu il ve ilçe listesinden
// (adres-yazisi.ts), müşterinin adres defteri sunucunun verdiği ülke verisinden. Bu dosya tarayıcıya gider: il ve ilçe
// listesini içe aktarmaz.
export type YazilacakAdres = {
  ulke: string;
  il?: string | undefined;
  ilce?: string | undefined;
  adres: string;
  postaKodu?: string | undefined;
};

export type AdresAdlari = {
  ulke: (kod: string) => string;
  il: (kod: string) => string | undefined;
  ilce: (kod: string) => string | undefined;
};

export const adresSatiri = (adres: YazilacakAdres, adlar: AdresAdlari): string =>
  [
    adres.adres,
    adres.postaKodu,
    [
      adres.ilce === undefined ? undefined : adlar.ilce(adres.ilce),
      adres.il === undefined ? undefined : adlar.il(adres.il),
    ]
      .filter((parca) => parca !== undefined)
      .join(" / "),
    adlar.ulke(adres.ulke),
  ]
    .filter((parca) => parca !== undefined && parca !== "")
    .join(", ");
