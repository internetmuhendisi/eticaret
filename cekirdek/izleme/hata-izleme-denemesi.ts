// Hata izleme aracının gerçek denemesi: sunucu tarafı (kart 0022, karar 0036). Çekirdeğin
// görüntüsünde tek dosya olarak durur (/uygulama/izleme/hata-denemesi.mjs). Deneme komutu
// (komutlar/hata-izleme-denemesi.mts) bunu yayındaki site kutusunun içinde çalıştırır:
//   docker exec <site kutusu> node izleme/hata-denemesi.mjs <işaret>
// Kutunun kendi ortamıyla (site klasörü, gönderim adresi) uygulamanın kullandığı yoldan geçer:
// araç hataIzlemeyiBagla ile bağlanır, hata hatayiKaydet ile kaydedilir. Hatanın içinde uydurma
// kişisel ve gizli bilgiler vardır; araca maskelenmiş gitmeleri gerekir. Dışarıdan bir adresle
// tetiklenemez. Çıktının son satırı: gonderim=<aracın yanıt kodu>.

import { hataIzlemeyiBagla } from "./hata-izleme-baglantisi.ts";
import { denemeDegerleri, denemeMesaji } from "./hata-izleme-denemesi-degerleri.ts";
import { hatayiKaydet } from "./hata-katmani.ts";

const yaz = (satir: string): void => {
  process.stdout.write(`${satir}\n`);
};

const [isaret] = process.argv.slice(2);
// İşaret yalnız küçük harflerdir: rakam dizisi maskeye takılır ve araçta aranamazdı.
if (!isaret || !/^[a-z]{12,32}$/.test(isaret)) {
  process.stderr.write("İşaret verilmedi (12-32 küçük harf).\n");
  process.exit(1);
}

// Aracın yanıtı gönderimin kendisinden okunur: başarısız gönderim yalnız günlüğe yazılırdı.
let durum = 0;
const asil = globalThis.fetch;
globalThis.fetch = async (...argumanlar: Parameters<typeof fetch>) => {
  const yanit = await asil(...argumanlar);
  durum = yanit.status;
  return yanit;
};

if (!hataIzlemeyiBagla()) {
  process.stderr.write("Hata izleme aracı bağlanmadı: kutuda gönderim adresi yok ya da bozuk.\n");
  process.exit(1);
}

// Uydurma değerler deneme komutunun aradığı değerlerdir (hata-izleme-denemesi-degerleri.ts).
const hata = new Error(denemeMesaji(isaret, "sunucu"));
Object.assign(hata, { ayrinti: `Bearer ${denemeDegerleri.jwt}` });
hatayiKaydet(hata, {
  kaynak: "hata-izleme-denemesi",
  isaret,
  eposta: denemeDegerleri.eposta,
  parola: denemeDegerleri.sifre,
});

process.on("beforeExit", () => {
  yaz(`gonderim=${durum}`);
  process.exitCode = durum === 200 ? 0 : 1;
});
