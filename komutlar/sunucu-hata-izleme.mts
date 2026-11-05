// Hata izleme aracını (Bugsink) sunucuya kurar ya da tanıma göre günceller (kart 0022, karar 0036).
//
//   pnpm sunucu-hata-izleme
//
// Önce ön kapıyı kurar: hata izleme kutusunun ağı ve dışarıdan gönderim adresi ön kapıdadır.
// Tekrar çalıştırılabilir; var olan gizli bilgiye ve kayıtlı hatalara dokunmaz. Yayın kilidiyle
// çalışır: aynı anda bir yayın ön kapıyı değiştiremez. pnpm sunucu-kur da bu adımı çalıştırır.

import { hataIzlemeOrtamlari, hataIzlemeyiKur } from "./hata-izleme.mts";
import { onKapiyiKur, yayinKilidiyle } from "./on-kapi.mts";
import { kayitlariOku } from "./sunucu.mts";

try {
  const [sunucu] = kayitlariOku();
  if (!sunucu) throw new Error("sunucu/sunucular.json'da sunucu yok. Önce: pnpm sunucu-kur");
  await yayinKilidiyle(sunucu.ipv4, () => {
    onKapiyiKur(sunucu.ipv4);
    console.log("kuruldu     ön kapı");
    for (const ortam of hataIzlemeOrtamlari) {
      hataIzlemeyiKur(sunucu.ipv4, ortam, (satir) => console.log(satir));
    }
  });
  console.log("Hata izleme hazır. Deneme: pnpm hata-izleme-denemesi <site klasörü>");
} catch (hata) {
  console.error((hata as Error).message);
  process.exitCode = 1;
}
