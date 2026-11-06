// Bir siteyi elle bakıma alır (kart 0043, karar 0038). Vitrin ve yönetim paneli kapanır, ziyaretçi bakım
// sayfasını görür; sağlık ucu açık kalır. Bakım yayından sonra da sürer, yalnız bu komut kapatır.
//
//   pnpm bakim <site klasörü> <ortam> ac|kapat|durum

import { siteKlasorunuDogrula } from "../cekirdek/ayar-semasi/site-klasoru.ts";
import { ortamMi } from "./gizli-bilgi.mts";
import { bakimDegistir, bakimdakiSiteleriOku, denemeAdresi, yayinOrtami } from "./on-kapi.mts";
import { kayitlariOku } from "./sunucu.mts";

try {
  const [klasor, ortam, islem] = process.argv.slice(2);
  if (!klasor || !ortam || !ortamMi(ortam) || !["ac", "kapat", "durum"].includes(islem ?? "")) {
    throw new Error("Kullanım: pnpm bakim <site klasörü> <deneme|canli> <ac|kapat|durum>");
  }
  // Ön kapı yalnız deneme adreslerini biliyor; canlı ortam alan adı bağlanınca eklenir.
  if (ortam !== yayinOrtami)
    throw new Error(`Bakım şimdilik yalnız ${yayinOrtami} ortamında çalışır.`);
  const sonuc = siteKlasorunuDogrula(klasor);
  if (!sonuc.gecerli) throw new Error(`${klasor} geçersiz:\n  ${sonuc.hatalar.join("\n  ")}`);
  const { kodAdi } = sonuc.site.kimlik;
  const [sunucu] = kayitlariOku();
  if (!sunucu) throw new Error("sunucu/sunucular.json'da sunucu yok. Önce: pnpm sunucu-kur");
  if (islem !== "durum") await bakimDegistir(sunucu.ipv4, kodAdi, islem === "ac");
  const zaman = bakimdakiSiteleriOku(sunucu.ipv4).get(kodAdi);
  console.log(
    zaman
      ? `Bakım açık: https://${denemeAdresi(kodAdi)} (${zaman}'den beri). Kapatmak için: pnpm bakim ${klasor} ${ortam} kapat`
      : `Bakım kapalı: https://${denemeAdresi(kodAdi)}`,
  );
} catch (hata) {
  console.error((hata as Error).message);
  process.exitCode = 1;
}
