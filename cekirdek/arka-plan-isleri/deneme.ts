// Arka plan kuyruğunun gerçek denemesi (kart 0031, karar 0049). Görüntüde tek dosya olarak durur
// (/uygulama/arka-plan/deneme.mjs). Deneme komutu (komutlar/arka-plan-denemesi.mts) bunu çalışan arka
// plan kutusunun içinde çalıştırır:
//   docker exec <arka plan kutusu> node arka-plan/deneme.mjs <işaret>
// İki işi kuyruğa koyar, kutudaki sürecin işlemesini bekler ve sonucu yazar; satırlarını siler.
// Dışarıdan bir adresle tetiklenemez. Çıktı satırları: basarili=<durum> <deneme>, hatali=<durum> <deneme>.
import { inArray } from "drizzle-orm";
import { denemeIsaretiBicimi, isDurumu } from "../kayitlar/arka-plan.ts";
import { baglantiyiKapat, siteninVeritabani } from "../veritabani/baglanti.ts";
import { basariliDenemeIsi, hataliDenemeIsi } from "./isler.ts";
import { isEkle } from "./kuyruk.ts";
import { arkaPlanIsleri } from "./model.ts";

const [isaret] = process.argv.slice(2);
if (!isaret || !denemeIsaretiBicimi.test(isaret)) {
  process.stderr.write("İşaret verilmedi (12-32 küçük harf).\n");
  process.exit(1);
}

const vt = siteninVeritabani();
const basarili = await isEkle(vt, basariliDenemeIsi, { isaret });
const hatali = await isEkle(vt, hataliDenemeIsi, { isaret });
const kimlikler = [basarili, hatali].filter((kimlik) => kimlik !== null);

const sonucDurumlari: string[] = [isDurumu.bitti, isDurumu.hata];
const oku = () => vt.select().from(arkaPlanIsleri).where(inArray(arkaPlanIsleri.kimlik, kimlikler));
let satirlar = await oku();
for (let tur = 0; tur < 60 && !satirlar.every((is) => sonucDurumlari.includes(is.durum)); tur++) {
  await new Promise((coz) => setTimeout(coz, 1000));
  satirlar = await oku();
}
for (const [ad, kimlik] of [
  ["basarili", basarili],
  ["hatali", hatali],
] as const) {
  const satir = satirlar.find((is) => is.kimlik === kimlik);
  process.stdout.write(`${ad}=${satir?.durum ?? "yok"} ${satir?.deneme_sayisi ?? 0}\n`);
}
await vt.delete(arkaPlanIsleri).where(inArray(arkaPlanIsleri.kimlik, kimlikler));
await baglantiyiKapat();
