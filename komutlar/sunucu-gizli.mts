// Bir sitenin gizli bilgilerini sunucuda kurar ya da yeniler (kart 0019, karar 0031).
//
//   pnpm sunucu-gizli <site klasörü> <deneme|canli>            yoksa üretir, varsa dokunmaz
//   pnpm sunucu-gizli <site klasörü> <deneme|canli> --yenile   hepsini yeniler (ör. devirde)
//
// Değer sunucuda üretilir, ekrana, günlüğe ve bu bilgisayara gelmez. Site numarası yoksa verilir
// ve sunucu/site-kullanicilari.json'a yazılır (bu dosya kayda girer, gizli değildir).
// Yenilenen değeri kutu ancak yeniden başlayınca görür; veritabanı şifresinin PostgreSQL'de de
// değişmesi yayın komutunun işidir (kart 0021).

import { siteKlasorunuDogrula } from "../cekirdek/ayar-semasi/site-klasoru.ts";
import { ortamMi, siteNumarasiAl, uretmeBetigi } from "./gizli-bilgi.mts";
import { kayitlariOku, sshKomutu } from "./sunucu.mts";

try {
  const [klasor, ortam] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  if (!klasor || !ortam || !ortamMi(ortam)) {
    throw new Error("Kullanım: pnpm sunucu-gizli <site klasörü> <deneme|canli> [--yenile]");
  }
  const sonuc = siteKlasorunuDogrula(klasor);
  if (!sonuc.gecerli) throw new Error(`${klasor} geçersiz:\n  ${sonuc.hatalar.join("\n  ")}`);
  const { kodAdi } = sonuc.site.kimlik;
  const [sunucu] = kayitlariOku();
  if (!sunucu) throw new Error("sunucu/sunucular.json'da sunucu yok. Önce: pnpm sunucu-kur");

  const numara = siteNumarasiAl(kodAdi);
  const betik = uretmeBetigi(ortam, kodAdi, numara, { yenile: process.argv.includes("--yenile") });
  const calisma = sshKomutu(sunucu.ipv4, "bash -s", { girdi: betik });
  process.stdout.write(calisma.stdout);
  if (calisma.status !== 0) throw new Error(`Sunucuda kurulamadı: ${calisma.stderr.trim()}`);
  // Kutu dosyayı açılışta bağlar; yenilenen değeri ancak yeniden başlayınca görür (ölçüldü,
  // pnpm sunucu-gizli-denemesi).
  if (process.argv.includes("--yenile")) {
    console.log(
      `Uyarı: ${kodAdi} ${ortam} kutusu çalışıyorsa yeni değeri yeniden başlayınca görür.`,
    );
  }
} catch (hata) {
  console.error((hata as Error).message);
  process.exitCode = 1;
}
