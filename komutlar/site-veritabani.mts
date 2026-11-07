// Komutların ortak parçası: verilen site klasörünü okur ve VERITABANI_ADRESI'nin o siteye
// ait olduğunu kontrol eder. Başka sitenin adresiyle çalışılmasını önler (karar 0022).
// Siteye veritabanı ve kullanıcı açan tek yol da buradadır; komut ve veri ayrımı testi bunu kullanır.

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { siteKlasorunuOku } from "../cekirdek/ayar-semasi/site-klasoru.ts";
import { siteVeritabaniAdi, veritabaniAdresi } from "../cekirdek/veritabani/baglanti.ts";
import { ustBilgiKapatmaSql } from "./site-ust-bilgi.mts";

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

const kok = join(import.meta.dirname, "..");

// Siteye veritabanı ve kullanıcı açan SQL betiği; şifreyi çağıran önüne ekler. Sonunda sitenin veritabanına
// geçip başka sitelerin üst bilgisini kapatır (karar 0053). Yönetici oradan yerel soketle bağlanır.
export const veritabaniAcmaBetigi = (): string =>
  `${readFileSync(join(import.meta.dirname, "site-veritabani-ac.sql"), "utf8")}
\\connect :"ad"
${ustBilgiKapatmaSql()}`;

// Yerel kutuda açma betiğini çalıştıran komut. Şifre psql'e ortam değişkeniyle geçer, komut
// satırında görünmez.
export const veritabaniAcmaKomutu = (ad: string, sifre: string) => ({
  komut: "docker",
  argumanlar: [
    ...["compose", "-f", join(kok, "sunucu", "compose.yaml"), "--env-file", join(kok, ".env")],
    ...["exec", "-T", "-e", "SITE_VERITABANI_SIFRESI", "veritabani"],
    ...["psql", "-U", "postgres", "-d", "postgres", "-q", "-v", `ad=${ad}`, "-f", "-"],
  ],
  girdi: `\\getenv sifre SITE_VERITABANI_SIFRESI\n${veritabaniAcmaBetigi()}`,
  ortam: { ...process.env, SITE_VERITABANI_SIFRESI: sifre },
});

// Yerel PostgreSQL kutusunda veritabanını ve kullanıcısını açar (site-veritabani-ac.sql).
// Başarılıysa true döner.
export const veritabaniVeKullaniciAc = (ad: string, sifre: string): boolean => {
  const { komut, argumanlar, girdi, ortam } = veritabaniAcmaKomutu(ad, sifre);
  const sonuc = spawnSync(komut, argumanlar, {
    input: girdi,
    env: ortam,
    stdio: ["pipe", "inherit", "inherit"],
  });
  return sonuc.status === 0;
};
