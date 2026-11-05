// Bir sitenin yayın kaydını gösterir (kart 0021, karar 0035).
//
//   pnpm yayin-kaydi siteler/<kod adı> deneme

import { siteKlasorunuDogrula } from "../cekirdek/ayar-semasi/site-klasoru.ts";
import { yayinOrtami } from "./on-kapi.mts";
import { kayitlariOku as sunuculariOku } from "./sunucu.mts";
import { etkinYigini, kayitlariOku } from "./yayin.mts";

try {
  const [klasor, ortam] = process.argv.slice(2);
  if (!klasor || ortam !== yayinOrtami) {
    throw new Error(`Kullanım: pnpm yayin-kaydi siteler/<kod adı> ${yayinOrtami}`);
  }
  const sonuc = siteKlasorunuDogrula(klasor);
  if (!sonuc.gecerli) throw new Error(`${klasor} geçersiz:\n  ${sonuc.hatalar.join("\n  ")}`);
  const [sunucu] = sunuculariOku();
  if (!sunucu) throw new Error("sunucu/sunucular.json'da sunucu yok. Önce: pnpm sunucu-kur");
  const kayitlar = kayitlariOku(sunucu.ipv4, yayinOrtami, sonuc.site.kimlik.kodAdi);
  if (kayitlar.length === 0) console.log("Bu sitenin yayın kaydı yok.");
  for (const k of kayitlar) {
    const tur = k.tur === "yayin" ? "yayın     " : "geri dönüş";
    const durum = k.sonuc === "basarili" ? "başarılı " : "BAŞARISIZ";
    console.log(
      `${String(k.no).padStart(3)}  ${k.zaman}  ${tur}  ${durum}  etkin ${k.etkin}  sürüm ${k.surum || "-"}  kayıt ${k.kayit.slice(0, 12) || "-"}${k.neden ? `  (${k.neden})` : ""}`,
    );
  }
  const etkin = etkinYigini(kayitlar).at(-1);
  if (etkin !== undefined) console.log(`Etkin yayın: ${etkin}`);
} catch (hata) {
  console.error((hata as Error).message);
  process.exitCode = 1;
}
