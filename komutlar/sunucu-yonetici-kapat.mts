// Yayındaki sitenin yöneticisini kapatır (kart 0048, karar 0054). Panel denemesi yarıda kalıp geçici hesap açık
// kaldığında kullanılır. Son tam yetkili yönetici kapatılamaz (karar 0040).
//
//   pnpm sunucu-yonetici-kapat <site klasörü> <ortam> <e-posta>

import { siteKlasorunuDogrula } from "../cekirdek/ayar-semasi/site-klasoru.ts";
import { siteNumarasiAl } from "./gizli-bilgi.mts";
import { yayindakiSiteleriOku, yayinOrtami } from "./on-kapi.mts";
import { kayitlariOku, sshKomutu } from "./sunucu.mts";
import { yoneticiBetigi } from "./sunucu-yonetici.mts";
import { yayinGoruntusu } from "./yayin.mts";

try {
  const [klasor, ortam, eposta] = process.argv.slice(2);
  if (!klasor || ortam !== yayinOrtami || !eposta) {
    throw new Error(`Kullanım: pnpm sunucu-yonetici-kapat <site klasörü> ${yayinOrtami} <e-posta>`);
  }
  const sonuc = siteKlasorunuDogrula(klasor);
  if (!sonuc.gecerli) throw new Error(`${klasor} geçersiz:\n  ${sonuc.hatalar.join("\n  ")}`);
  const { kodAdi } = sonuc.site.kimlik;
  const [sunucu] = kayitlariOku();
  if (!sunucu) throw new Error("sunucu/sunucular.json'da sunucu yok.");
  const no = yayindakiSiteleriOku(sunucu.ipv4)[kodAdi];
  if (no === undefined) throw new Error(`${kodAdi} yayında değil.`);
  const kutu = sshKomutu(
    sunucu.ipv4,
    yoneticiBetigi(
      "kapat",
      yayinOrtami,
      kodAdi,
      siteNumarasiAl(kodAdi),
      yayinGoruntusu(yayinOrtami, kodAdi, no),
      eposta,
    ),
  );
  if (kutu.status !== 0) throw new Error(kutu.stderr.trim() || "Yönetici kapatılamadı.");
  console.log(`kapatıldı   ${kodAdi}: ${eposta}`);
} catch (hata) {
  console.error((hata as Error).message);
  process.exitCode = 1;
}
