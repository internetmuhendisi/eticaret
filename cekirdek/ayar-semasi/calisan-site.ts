// Uygulamanın çalıştırdığı site (karar 0021). Uygulama hangi site olduğunu yalnız
// SITE_KLASORU ortam değişkenindeki klasörden öğrenir; çekirdekte site adı geçmez.
// Göreli yol, uygulamanın çalıştığı klasöre göredir.
import { resolve } from "node:path";
import { type Site, siteKlasorunuOku } from "./site-klasoru.ts";

// Site süreç başına bir kez okunur (kart 0035, karar 0026). Next.js açılış kontrolünü ve sayfaları
// ayrı paketlere derler, her paket bu dosyanın ayrı bir kopyasını taşır. Okunan site bu yüzden
// dosyanın içinde değil, sürecin ortak alanında tutulur; açılışta doğrulanan site sayfaların
// kullandığı sitedir.
const anahtar = Symbol.for("cekirdek.calisanSite");
const ortak = globalThis as { [anahtar]?: Site };

export const calisanSite = (): Site => {
  const okunan = ortak[anahtar];
  if (okunan !== undefined) return okunan;
  const { SITE_KLASORU: klasor } = process.env;
  if (!klasor) {
    throw new Error(
      "SITE_KLASORU ortam değişkeni yok. Çalıştırılacak sitenin klasörünü verin: SITE_KLASORU=siteler/<kod-adi>.",
    );
  }
  const site = siteKlasorunuOku(resolve(klasor));
  ortak[anahtar] = site;
  return site;
};
