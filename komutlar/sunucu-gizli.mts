// Bir sitenin gizli bilgilerini sunucuda kurar ya da yeniler (kart 0019, karar 0031).
//
//   pnpm sunucu-gizli <site klasörü> <deneme|canli>            yoksa üretir, varsa dokunmaz
//   pnpm sunucu-gizli <site klasörü> <deneme|canli> --yenile   hepsini yeniler (ör. devirde)
//
// Değer sunucuda üretilir, ekrana, günlüğe ve bu bilgisayara gelmez. Site numarası yoksa verilir
// ve sunucu/site-kullanicilari.json'a yazılır (bu dosya kayda girer, gizli değildir).
// Ortamda veritabanı varsa sitenin veritabanı şifresi aynı adımda yeni değere eşitlenir
// (kart 0039) ve yayındaki kutu yeni değerle yeniden başlatılır (kart 0021).

import { siteKlasorunuDogrula } from "../cekirdek/ayar-semasi/site-klasoru.ts";
import { ortamMi, siteNumarasiAl, uretmeBetigi } from "./gizli-bilgi.mts";
import { yayinKilidiyle, yayinOrtami } from "./on-kapi.mts";
import { kayitlariOku, sshKomutu } from "./sunucu.mts";
import { sifreyiEsitle } from "./sunucu-veritabani.mts";
import { etkinKutuyuYenidenBaslat } from "./yayin.mts";

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
      sifreyiEsitle(sunucu.ipv4, ortam, kodAdi)
        ? `eşitlendi   ${ortam}/${kodAdi} veritabanı şifresi`
        : `bilgi       ${ortam} ortamında veritabanı kutusu yok, şifre eşitlenmedi`,
    );
    // Yayındaki kutu eski dosyayı görmeye devam eder; aynı adımda yeniden başlatılır (kart 0021).
    console.log(
      ortam === yayinOrtami &&
        (await yayinKilidiyle(sunucu.ipv4, () =>
          etkinKutuyuYenidenBaslat(sunucu.ipv4, ortam, kodAdi),
        ))
        ? `yeniden     ${ortam}/${kodAdi} yayındaki kutu yeni değerle başlatıldı`
        : `bilgi       ${ortam}/${kodAdi} yayında değil, yeniden başlatılacak kutu yok`,
    );
  }
} catch (hata) {
  console.error((hata as Error).message);
  process.exitCode = 1;
}
