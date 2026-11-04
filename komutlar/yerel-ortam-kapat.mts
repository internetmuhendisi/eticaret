// Yerelde tam ortamı kapatır (kart 0016, karar 0028). Bütün kutular kapanır; geçici deneme
// siteleri, veritabanları ve .env satırlarıyla birlikte silinir. Sitelerin verisi silinmez.
// Çalıştırma: pnpm yerel-ortam-kapat

import { ortamiKapat } from "./yerel-ortam.mts";

try {
  const silinenler = await ortamiKapat();
  for (const kodAdi of silinenler) console.log(`silindi     deneme sitesi ${kodAdi}`);
  console.log("Ortam kapandı.");
} catch (hata) {
  console.error((hata as Error).message);
  process.exitCode = 1;
}
