// Komutların ortak parçası: verilen site klasörünü okur ve VERITABANI_ADRESI'nin o siteye
// ait olduğunu kontrol eder. Başka sitenin adresiyle çalışılmasını önler (karar 0022).

import { siteKlasorunuOku } from "../cekirdek/ayar-semasi/site-klasoru.ts";
import { siteVeritabaniAdi, veritabaniAdresi } from "../cekirdek/veritabani/baglanti.ts";

export const siteVeAdres = (komut: string) => {
  const [klasor] = process.argv.slice(2);
  if (!klasor) {
    console.error(`Site klasörü verilmedi. Kullanım: pnpm ${komut} siteler/<kod-adi>`);
    process.exit(1);
  }
  const { kimlik } = siteKlasorunuOku(klasor);
  const ad = siteVeritabaniAdi(kimlik.kodAdi);
  const adres = new URL(veritabaniAdresi());
  const kullanici = decodeURIComponent(adres.username);
  const veritabani = decodeURIComponent(adres.pathname.slice(1));
  if (kullanici !== ad || veritabani !== ad) {
    console.error(
      `VERITABANI_ADRESI bu sitenin değil: ${kimlik.kodAdi} için kullanıcı ve veritabanı adı ${ad} olmalı (adreste kullanıcı "${kullanici}", veritabanı "${veritabani}").`,
    );
    process.exit(1);
  }
  return { kodAdi: kimlik.kodAdi, ad, adres };
};
