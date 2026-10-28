// Uygulamanın çalıştırdığı site (karar 0021). Uygulama hangi site olduğunu yalnız
// SITE_KLASORU ortam değişkenindeki klasörden öğrenir; çekirdekte site adı geçmez.
// Göreli yol, uygulamanın çalıştığı klasöre göredir.
import { resolve } from "node:path";
import { type Site, siteKlasorunuOku } from "./site-klasoru.ts";

let site: Site | undefined;

export const calisanSite = (): Site => {
  if (site === undefined) {
    const { SITE_KLASORU: klasor } = process.env;
    if (!klasor) {
      throw new Error(
        "SITE_KLASORU ortam değişkeni yok. Çalıştırılacak sitenin klasörünü verin: SITE_KLASORU=siteler/<kod-adi>.",
      );
    }
    site = siteKlasorunuOku(resolve(klasor));
  }
  return site;
};
