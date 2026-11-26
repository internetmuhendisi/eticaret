// Arka plan kuyruğunun gerçek denemesi (kart 0031, karar 0049). Görüntüde tek dosya olarak durur
// (/uygulama/arka-plan/deneme.mjs). Deneme komutu (komutlar/arka-plan-denemesi.mts) bunu çalışan arka
// plan kutusunun içinde çalıştırır:
//   docker exec <arka plan kutusu> node arka-plan/deneme.mjs <işaret>
// İki işi kuyruğa koyar, kutudaki sürecin işlemesini bekler ve sonucu yazar; satırlarını siler.
// Dışarıdan bir adresle tetiklenemez. Çıktı satırları: onde=<sırası gelmiş iş> <bekleme>,
// basarili=<durum> <deneme>, hatali=<durum> <deneme>; işler sonuçlanmadıysa kuyruk=<türe göre sayılar>.
// İkinci argüman verilirse o adrese deneme e-postası da gönderilir: eposta=<durum> (kart 0032).
// Denemenin kendisi deneme-olcumu.ts'tedir (kart 0328).
import { denemeIsaretiBicimi } from "../kayitlar/arka-plan.ts";
import { baglantiyiKapat, siteninVeritabani } from "../veritabani/baglanti.ts";
import { kuyrukDenemesi } from "./deneme-olcumu.ts";

const [isaret, epostaAlicisi] = process.argv.slice(2);
if (!isaret || !denemeIsaretiBicimi.test(isaret)) {
  process.stderr.write("İşaret verilmedi (12-32 küçük harf).\n");
  process.exit(1);
}

const satirlar = await kuyrukDenemesi(siteninVeritabani(), { isaret, epostaAlicisi });
process.stdout.write(`${satirlar.join("\n")}\n`);
await baglantiyiKapat();
