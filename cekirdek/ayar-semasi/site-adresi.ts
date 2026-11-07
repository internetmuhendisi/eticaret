// E-postadaki bağlantıların sitenin adresi (kart 0034, karar 0052). İstekten alınmaz: Host başlığını yazan kişi
// başkasının e-postasına kendi sitesinin bağlantısını koyabilirdi. Kutu kendi adresini ortamdan söyleyebilir
// (yerel ortam), yoksa kimlik dosyasındaki adres kullanılır.
import type { Kimlik } from "./kimlik.ts";

export const siteAdresi = (kimlik: Pick<Kimlik, "adresler">): string | undefined => {
  const { SITE_ADRESI } = process.env;
  const adres = SITE_ADRESI || kimlik.adresler.canli || kimlik.adresler.deneme;
  return adres?.replace(/\/+$/, "");
};
