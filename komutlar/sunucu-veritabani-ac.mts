// Bir sitenin sunucudaki veritabanını açar ve değişikliklerini uygular (kart 0039, karar 0034).
//
//   pnpm sunucu-veritabani <site klasörü> <ortam>
//
// Tekrar çalıştırılabilir: var olan gizli bilgiye, veritabanına ve uygulanmış değişikliğe
// dokunmaz; yalnız eksik olanı kurar ve bekleyen değişiklikleri uygular. Şimdilik yalnız
// deneme ortamında veritabanı vardır (sunucu-veritabani.mts, veritabaniOrtamlari).

import { siteKlasorunuDogrula } from "../cekirdek/ayar-semasi/site-klasoru.ts";
import { siteNumarasiAl } from "./gizli-bilgi.mts";
import { kayitlariOku } from "./sunucu.mts";
import { siteVeritabaniniHazirla, veritabaniOrtamlari } from "./sunucu-veritabani.mts";

try {
  const [klasor, ortam] = process.argv.slice(2);
  const ortamlar: readonly string[] = veritabaniOrtamlari;
  if (!klasor || !ortam || !ortamlar.includes(ortam)) {
    throw new Error(
      `Kullanım: pnpm sunucu-veritabani <site klasörü> <${veritabaniOrtamlari.join("|")}>`,
    );
  }
  const sonuc = siteKlasorunuDogrula(klasor);
  if (!sonuc.gecerli) throw new Error(`${klasor} geçersiz:\n  ${sonuc.hatalar.join("\n  ")}`);
  const { kodAdi, cekirdekSurumu } = sonuc.site.kimlik;
  const [sunucu] = kayitlariOku();
  if (!sunucu) throw new Error("sunucu/sunucular.json'da sunucu yok. Önce: pnpm sunucu-kur");
  const { yeni, toplam } = siteVeritabaniniHazirla(
    sunucu.ipv4,
    ortam as (typeof veritabaniOrtamlari)[number],
    { kodAdi, numara: siteNumarasiAl(kodAdi), surum: cekirdekSurumu },
    (satir) => console.log(satir),
  );
  console.log(`güncellendi ${ortam}/${kodAdi}: ${yeni} yeni değişiklik, toplam ${toplam}.`);
} catch (hata) {
  console.error((hata as Error).message);
  process.exitCode = 1;
}
