// Bileşen kataloğunun açık olduğu yerler (kart 0104, karar 0078): geliştirme sunucusu ve deneme
// ortamındaki kutu. Kutunun ortamını yayın komutu verir (komutlar/yayin.mts). Ortamı bilinmeyen kutu
// canlı sayılır: değişken eksik ya da yanlışsa katalog kapalı kalır.
import { type SiteOrtami, siteOrtamiDegiskeni } from "../kayitlar/site.ts";

const katalogunAcikOlduguOrtam: SiteOrtami = "deneme";

type KatalogOrtami = Partial<Record<"NODE_ENV" | typeof siteOrtamiDegiskeni, string | undefined>>;

export const katalogAcikMi = (ortam: KatalogOrtami = process.env): boolean =>
  ortam.NODE_ENV === "development" || ortam[siteOrtamiDegiskeni] === katalogunAcikOlduguOrtam;
