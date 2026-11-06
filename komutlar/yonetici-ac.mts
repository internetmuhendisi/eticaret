// Bir siteye tam yetkili yönetici açar (kart 0027, karar 0042). Şifreyi komut üretir ve ekranda bir
// kez gösterir; hiçbir dosyaya ve günlüğe yazılmaz. Şimdilik yalnız yereldeki veritabanına bağlanır.
// Çalıştırma: pnpm yonetici-ac siteler/<kod-adi> <eposta>

import { randomBytes } from "node:crypto";
import { BilinenHata } from "../cekirdek/kapi/zarf.ts";
import { sistemIslemi } from "../cekirdek/kayitlar/degisiklik-islemleri.ts";
import { tamYetkiliYoneticiAc } from "../cekirdek/moduller/ekip/servis.ts";
import { baglan } from "../cekirdek/veritabani/baglanti.ts";
import { siteVeAdres } from "./site-veritabani.mts";

const hataMesajlari: Record<string, string> = {
  dogrulama: "E-posta geçersiz.",
  cakisma: "Bu e-postayla bir yönetici zaten var.",
  bulunamadi: "Tam yetkili rol yok. Önce veritabanını güncelleyin: pnpm veritabani-guncelle",
};

const eposta = process.argv[3];
if (!eposta) {
  console.error("E-posta verilmedi. Kullanım: pnpm yonetici-ac siteler/<kod-adi> <eposta>");
  process.exit(1);
}
const { kodAdi, adres } = siteVeAdres("yonetici-ac");
const veritabani = baglan(adres.href);

try {
  const sifre = randomBytes(24).toString("base64url");
  await tamYetkiliYoneticiAc(veritabani, { eposta, sifre }, sistemIslemi("yonetici-ac"));
  console.log(`açıldı      ${kodAdi}: ${eposta} (tam yetkili)`);
  console.log(`şifre       ${sifre}`);
  console.log("Şifre bir daha gösterilmez, güvenli bir yere yazın.");
} catch (hata) {
  const mesaj = hata instanceof BilinenHata ? hataMesajlari[hata.kod] : undefined;
  console.error(mesaj ?? (hata as Error).message);
  process.exitCode = 1;
} finally {
  await veritabani.$client.end();
}
