// Tarayıcı testlerinin sunucusunun günlüğü (kart 0226). Geliştirme sunucusu her istek için bir satır yazar
// ("POST /kapi/... 200 in 4905ms (next.js: …, application-code: …)"); satır isteğin derlemeyi mi işini mi
// beklediğini söyler. Asıl aşamanın canlı sunucusu istek satırı yazmaz (kart 0251, karar 0184): onun günlüğünde
// uygulamanın kendi satırları vardır. Satırlar hattın günlüğüne değil bu dosyaya yazılır (bütün takımda ~5 bin satır, ~1 MB),
// kontrol hattı dosyayı yalnız tarayıcı testleri kırmızıyken düşen testlerin iziyle saklar (karar 0131).
//
// Her satırın başına yazıldığı an (Unix saniyesi) konur: tarayıcı izinin saatiyle eşlenir. Adreslerin sorgu
// kısmının değerleri silinir, adları kalır (aranan metin, kimlik, dönüş adresi gitmez). Uygulamanın kendi
// günlüğü e-postayı zaten kısaltır, şifre ve anahtarı yazmaz (cekirdek/izleme/gunluk.ts).
//
// Kullanım (playwright.config.ts, playwright.gelistirme.config.ts): <sunucu> | node komutlar/sunucu-gunlugu.mts <dosya>
// Dosya her çalışmada baştan yazılır.

import { closeSync, mkdirSync, openSync, writeSync } from "node:fs";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

export const sunucuGunluguYolu = join(
  import.meta.dirname,
  "..",
  "sunucu",
  "olusan",
  "tarayici-sunucu-gunlugu.log",
);

// Renk kodları dosyada okunmaz.
const renkKodu = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");

// Yolla başlayan ya da adresin içindeki sorgu kısmı: "?" ile boşluğa, çift tırnağa (JSON satırındaki adresin sonu)
// ya da satır sonuna kadar. Tek tırnak sorgunun parçası sayılır (?ara=it's).
const sorguKismi = /\?([^\s"]*)/g;

const sorguyuKisalt = (_tamami: string, sorgu: string): string =>
  `?${sorgu
    .split("&")
    .map((parca) => {
      const esittir = parca.indexOf("=");
      return esittir === -1 ? parca : `${parca.slice(0, esittir)}=…`;
    })
    .join("&")}`;

export const satiriTemizle = (satir: string): string =>
  satir.replace(renkKodu, "").replace(sorguKismi, sorguyuKisalt);

export const gunlukSatiri = (anMs: number, satir: string): string =>
  `${(anMs / 1000).toFixed(3)} ${satiriTemizle(satir)}\n`;

const dogrudanCalisiyor = process.argv[1] === fileURLToPath(import.meta.url);

// Dosya açılamazsa günlük olmadan sürülür: uyarı hata akışına (hattın günlüğüne) bir kez yazılır, girdi sonuna
// kadar okunur, süreç girdi bitince hata koduyla biter. Çıkıp boruyu kırmak sunucuyu düşürmez: dash'te boru
// hattı sunucu bitene kadar sürer, sunucu sessizce çalışır ve testler günlüksüz koşardı (bağımsız kontrolün
// bulgusu, kart 0226).
export const dosyaAcilamadiUyarisi = (dosya: string, hata: unknown): string =>
  `Sunucu günlüğü yazılamıyor, satırlar kaydedilmeyecek (${dosya}): ${hata instanceof Error ? hata.message : String(hata)}\n`;

const dosyayiAc = (dosya: string): number | undefined => {
  try {
    mkdirSync(dirname(dosya), { recursive: true });
    return openSync(dosya, "w");
  } catch (hata) {
    process.stderr.write(dosyaAcilamadiUyarisi(dosya, hata));
    return undefined;
  }
};

if (dogrudanCalisiyor) {
  const dosya = process.argv[2] ?? sunucuGunluguYolu;
  // Her satır hemen yazılır: Playwright testlerden sonra sunucuyla birlikte bu süreci de sonlandırır,
  // tamponda bekleyen son satırlar (düşüşe en yakın olanlar) kaybolmasın.
  const dosyaNo = dosyayiAc(dosya);
  const okuyucu = createInterface({ input: process.stdin, crlfDelay: Number.POSITIVE_INFINITY });
  okuyucu.on("line", (satir) => {
    if (dosyaNo !== undefined) writeSync(dosyaNo, gunlukSatiri(Date.now(), satir));
  });
  okuyucu.on("close", () => {
    if (dosyaNo === undefined) process.exitCode = 1;
    else closeSync(dosyaNo);
  });
}
