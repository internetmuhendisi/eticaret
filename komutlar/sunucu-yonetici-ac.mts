// Yayındaki siteye tam yetkili yönetici açar (kart 0048, karar 0054). Şifre sunucuda üretilir, bu ekranda bir kez
// görünür; sunucuda, günlükte ve kayıtta kalmaz. Şimdilik yalnız deneme ortamında yayın vardır.
//
//   pnpm sunucu-yonetici-ac <site klasörü> <ortam> <e-posta>

import { siteKlasorunuDogrula } from "../cekirdek/ayar-semasi/site-klasoru.ts";
import { epostaSemasi } from "../cekirdek/moduller/oturum/semalar.ts";
import { siteNumarasiAl } from "./gizli-bilgi.mts";
import { denemeAdresi, yayindakiSiteleriOku, yayinOrtami } from "./on-kapi.mts";
import { kayitlariOku, sshKomutu } from "./sunucu.mts";
import { sifreyiOku, yoneticiBetigi } from "./sunucu-yonetici.mts";
import { yayinGoruntusu } from "./yayin.mts";

try {
  const [klasor, ortam, eposta] = process.argv.slice(2);
  if (!klasor || ortam !== yayinOrtami || !eposta) {
    throw new Error(`Kullanım: pnpm sunucu-yonetici-ac <site klasörü> ${yayinOrtami} <e-posta>`);
  }
  const sonuc = siteKlasorunuDogrula(klasor);
  if (!sonuc.gecerli) throw new Error(`${klasor} geçersiz:\n  ${sonuc.hatalar.join("\n  ")}`);
  const { kodAdi } = sonuc.site.kimlik;
  const [sunucu] = kayitlariOku();
  if (!sunucu) throw new Error("sunucu/sunucular.json'da sunucu yok.");
  const no = yayindakiSiteleriOku(sunucu.ipv4)[kodAdi];
  if (no === undefined) throw new Error(`${kodAdi} yayında değil. Önce: pnpm yayinla`);
  const etiket = yayinGoruntusu(yayinOrtami, kodAdi, no);
  const betik = yoneticiBetigi("ac", yayinOrtami, kodAdi, siteNumarasiAl(kodAdi), etiket, eposta);
  const kutu = sshKomutu(sunucu.ipv4, betik);
  // Şifre çıktıysa hesap açılmıştır: bağlantı sonra kopmuş olsa da şifre gösterilir, yoksa kaybolurdu.
  const sifre = sifreyiOku(kutu.stdout);
  if (sifre === null) throw new Error(kutu.stderr.trim() || "Yönetici açılamadı.");
  if (kutu.status !== 0) console.error("Bağlantı sonda hata verdi, hesap açılmış görünüyor.");
  console.log(`açıldı      ${kodAdi}: ${epostaSemasi.parse(eposta)} (tam yetkili)`);
  console.log(`adres       https://${denemeAdresi(kodAdi)}/yonetim`);
  console.log(`şifre       ${sifre}`);
  console.log("Şifre bir daha gösterilmez, güvenli bir yere yazın.");
  console.log("İlk girişte telefonunuzdaki doğrulama uygulamasıyla iki aşamalı giriş kurulur.");
} catch (hata) {
  console.error((hata as Error).message);
  process.exitCode = 1;
}
