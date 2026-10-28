// Bir sitenin veritabanına bekleyen numaralı değişiklikleri sırayla uygular (kart 0011).
// Notu olmayan değişiklik varsa ya da veritabanı başka bir siteye aitse hiçbir şey uygulamaz.
// Çalıştırma: pnpm veritabani-guncelle siteler/<kod-adi>

import { baglan } from "../cekirdek/veritabani/baglanti.ts";
import { siteVeritabaniniGuncelle } from "../cekirdek/veritabani/guncelle.ts";
import { siteVeAdres } from "./site-veritabani.mts";

const { kodAdi, ad, adres } = siteVeAdres("veritabani-guncelle");
const veritabani = baglan(adres.href);

try {
  const { once, sonra } = await siteVeritabaniniGuncelle(veritabani, kodAdi);
  console.log(
    `güncellendi ${ad}: ${sonra - once} yeni değişiklik uygulandı, toplam ${sonra} değişiklik.`,
  );
} catch (hata) {
  console.error((hata as Error).message);
  process.exitCode = 1;
} finally {
  await veritabani.$client.end();
}
