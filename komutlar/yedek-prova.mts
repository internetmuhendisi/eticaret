// Yedeği ayrı, geçici bir veritabanına açar ve canlıyla karşılaştırır (kart 0024, karar 0037).
// Canlıya yazmaz. Site son yedekten sonra yazdıysa fark görünür: --yeni o an alınan yedekle dener.
//
//   pnpm yedek-prova <site klasörü> <ortam> [--yeni] [--dosya=<yedek dosyası>]

import { sunucudaCalistir } from "./sunucu-veritabani.mts";
import { provaYap, sonYedegiBulBetigi, yedekAlmaBetigi } from "./yedek.mts";
import { secenek, yedekSitesi } from "./yedek-girdi.mts";

try {
  const { ipv4, ortam, kodAdi } = yedekSitesi("yedek-prova");
  if (process.argv.includes("--yeni")) {
    process.stdout.write(sunucudaCalistir(ipv4, yedekAlmaBetigi(ortam, kodAdi, "elle"), 600_000));
  }
  const dosya =
    secenek("dosya") ?? sunucudaCalistir(ipv4, sonYedegiBulBetigi(ortam, kodAdi)).trim();
  if (!dosya) throw new Error(`${ortam}/${kodAdi} için depoda yedek yok.`);
  const { farklar, tablolar, satirlar } = provaYap(ipv4, ortam, kodAdi, dosya);
  if (farklar.length > 0) throw new Error(`Yedek ${dosya} farklı:\n  ${farklar.join("\n  ")}`);
  console.log(`Prova yeşil: ${dosya}, ${tablolar} tablo, ${satirlar} satır, canlıyla aynı.`);
} catch (hata) {
  console.error((hata as Error).message);
  process.exitCode = 1;
}
