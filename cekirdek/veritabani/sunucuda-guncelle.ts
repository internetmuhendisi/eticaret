// Sunucuda bir sitenin veritabanına bekleyen değişiklikleri uygular (kart 0039, karar 0034).
// Çekirdeğin görüntüsünde tek dosya olarak durur (/uygulama/veritabani/guncelle.mjs) ve
// değişiklik dosyaları yanındaki degisiklikler/ klasöründedir. Komut sitenin kutu kullanıcısıyla,
// sitenin ağında ve sitenin gizli bilgi dosyasıyla çalıştırılır (komutlar/sunucu-veritabani.mts):
//   node veritabani/guncelle.mjs <kod adı>
// Adres yalnız gizliBilgi() ile okunur ve ekrana basılmaz. Adres verilen siteye ait değilse,
// notsuz, sırası bozuk ya da sonradan değişmiş değişiklik varsa hiçbir şey uygulanmaz.
import { baglan, siteVeritabaniAdi, veritabaniAdresi } from "./baglanti.ts";
import { siteVeritabaniniGuncelle } from "./guncelle.ts";

const yaz = (satir: string): void => {
  process.stdout.write(`${satir}\n`);
};

const [kodAdi] = process.argv.slice(2);
if (!kodAdi) {
  process.stderr.write("Kod adı verilmedi.\n");
  process.exit(1);
}
const ad = siteVeritabaniAdi(kodAdi);
const adres = new URL(veritabaniAdresi());
if (
  decodeURIComponent(adres.username) !== ad ||
  decodeURIComponent(adres.pathname.slice(1)) !== ad
) {
  process.stderr.write(`Veritabanı adresi ${kodAdi} sitesinin değil, hiçbir şey uygulanmadı.\n`);
  process.exit(1);
}

const veritabani = baglan(adres.href);
try {
  const { once, sonra } = await siteVeritabaniniGuncelle(veritabani, kodAdi);
  yaz(`guncellendi ${ad} yeni=${sonra - once} toplam=${sonra}`);
} catch (hata) {
  process.stderr.write(`${(hata as Error).message}\n`);
  process.exitCode = 1;
} finally {
  await veritabani.$client.end();
}
