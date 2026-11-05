// Bir siteyi bir önceki başarılı yayınına döndürür (kart 0021, karar 0035).
//
//   pnpm geri-don siteler/<kod adı> deneme
//
// Dönülen yayının kutusu kendi klasörü ve görüntüsüyle yeniden açılır, sağlık kontrolünden sonra
// trafik ona verilir. Veritabanına dokunulmaz: aradaki değişikliklerden biri "yedekten" notu
// taşıyorsa dönülmez, komut bunu söyler. Kontrol hattı kilidi yoktur; dönülen yayın zaten
// yayınlanmış ve hattan geçmiş bir kayıttır. Her çalıştırma yayın kaydına yazılır.

import { siteKlasorunuDogrula } from "../cekirdek/ayar-semasi/site-klasoru.ts";
import { yayinOrtami } from "./on-kapi.mts";
import { kayitlariOku as sunuculariOku } from "./sunucu.mts";
import { geriDon } from "./yayin.mts";

try {
  const [klasor, ortam] = process.argv.slice(2);
  if (!klasor || ortam !== yayinOrtami) {
    throw new Error(`Kullanım: pnpm geri-don siteler/<kod adı> ${yayinOrtami}`);
  }
  const sonuc = siteKlasorunuDogrula(klasor);
  if (!sonuc.gecerli) throw new Error(`${klasor} geçersiz:\n  ${sonuc.hatalar.join("\n  ")}`);
  const [sunucu] = sunuculariOku();
  if (!sunucu) throw new Error("sunucu/sunucular.json'da sunucu yok. Önce: pnpm sunucu-kur");
  const kayit = await geriDon({
    ipv4: sunucu.ipv4,
    ortam: yayinOrtami,
    kodAdi: sonuc.site.kimlik.kodAdi,
    yaz: (satir) => console.log(satir),
  });
  if (kayit.sonuc !== "basarili") throw new Error(`Geri dönüş başarısız: ${kayit.neden}`);
  console.log(`yayında     ${sonuc.site.kimlik.kodAdi} yayın ${kayit.etkin}, sürüm ${kayit.surum}`);
} catch (hata) {
  console.error((hata as Error).message);
  process.exitCode = 1;
}
