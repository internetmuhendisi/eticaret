// Yayındaki sitenin yöneticisinin iki aşamalı girişini sıfırlar (kart 0053, karar 0178). Telefonunu ve yedek kodlarını
// kaybeden son mağaza sahibi için: öteki yöneticilerinkini mağaza sahibi panelden sıfırlar. Önce kişinin kimliği elle
// doğrulanır (karar 0178). Yönetici bir sonraki girişte kurulum ekranına düşer;
// eski kodlar, yedek kodlar ve açık oturumları geçersiz olur. İşlem değişiklik kaydına "sunucu-yonetici" adıyla girer.
//
//   pnpm sunucu-yonetici-iki-asama-sifirla <site klasörü> <ortam> <e-posta>

import { siteKlasorunuDogrula } from "../cekirdek/ayar-semasi/site-klasoru.ts";
import { siteNumarasiAl } from "./gizli-bilgi.mts";
import { yayindakiSiteleriOku, yayinOrtami } from "./on-kapi.mts";
import { kayitlariOku, sshKomutu } from "./sunucu.mts";
import { yoneticiBetigi } from "./sunucu-yonetici.mts";
import { yayinGoruntusu } from "./yayin.mts";

try {
  const [klasor, ortam, eposta] = process.argv.slice(2);
  if (!klasor || ortam !== yayinOrtami || !eposta) {
    throw new Error(
      `Kullanım: pnpm sunucu-yonetici-iki-asama-sifirla <site klasörü> ${yayinOrtami} <e-posta>`,
    );
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
      "iki-asama-sifirla",
      yayinOrtami,
      kodAdi,
      siteNumarasiAl(kodAdi),
      yayinGoruntusu(yayinOrtami, kodAdi, no),
      eposta,
    ),
  );
  if (kutu.status !== 0) throw new Error(kutu.stderr.trim() || "İki aşamalı giriş sıfırlanamadı.");
  console.log(`sıfırlandı  ${kodAdi}: ${eposta}`);
} catch (hata) {
  console.error((hata as Error).message);
  process.exitCode = 1;
}
