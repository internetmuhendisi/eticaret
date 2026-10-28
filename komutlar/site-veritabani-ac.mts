// Yerel PostgreSQL kutusunda bir siteye ayrı veritabanı ve ayrı kullanıcı açar (kart 0011).
// Şifre VERITABANI_ADRESI'nden alınır.
// Çalıştırma: pnpm site-veritabani-ac siteler/<kod-adi>   (önce pnpm veritabani-baslat)

import { siteVeAdres, veritabaniVeKullaniciAc } from "./site-veritabani.mts";

const { ad, adres } = siteVeAdres("site-veritabani-ac");

if (!veritabaniVeKullaniciAc(ad, decodeURIComponent(adres.password))) {
  console.error(`${ad} açılamadı. Veritabanı kutusu açık mı? (pnpm veritabani-baslat)`);
  process.exit(1);
}
console.log(`açıldı      ${ad} (veritabanı ve kullanıcı)`);
