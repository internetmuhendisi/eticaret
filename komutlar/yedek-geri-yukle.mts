// Bir sitenin veritabanını yedekten geri yükler, öteki sitelere dokunmaz (kart 0024, karar 0037).
// Son yedekten sonraki veri kaybolur. Önce o anki durumun yedeği alınır.
//
//   pnpm yedek-geri-yukle <site klasörü> <ortam>                      depodaki yedekleri listeler
//   pnpm yedek-geri-yukle <site klasörü> <ortam> --dosya=<ad> [--onay=<kod adı>]
//
// Önceki geri yükleme yarım kaldıysa komut durur ve şu ikisinden birini ister:
//   --eskiye-don   önceki veriyi yerine koyar; şu anki hâlin yedeği önce alınır
//   --eskiyi-sil   şu anki hâli kabul eder, sağlıklı çalışınca önceki veriyi siler
//                  (önceki verinin yedeği yoksa --yedeksiz-onay da ister)
//
// Veritabanı bozuk olduğu için o anki durumun yedeği alınamıyorsa --son-yedeksiz verilir: önceki veri
// silinmez, sonradan --eskiyi-sil ile silinir. Veritabanı hiç yoksa önce: pnpm sunucu-veritabani.

import { createInterface } from "node:readline/promises";
import { sunucudaCalistir } from "./sunucu-veritabani.mts";
import {
  eskiyeDon,
  eskiyiSil,
  geriYukle,
  geriYuklemeSecimi,
  yedekListesiBetigi,
} from "./yedek.mts";
import { secenek, yedekSitesi } from "./yedek-girdi.mts";

try {
  const { ipv4, ortam, kodAdi, numara } = yedekSitesi("yedek-geri-yukle");
  const secimler = geriYuklemeSecimi(process.argv.slice(2));
  let dosya = "";
  if (secimler === "eskiye-don") {
    console.log(
      `${ortam}/${kodAdi} önceki veriye dönecek. Şu anki hâl (sonradan gelen siparişler dahil) yerinden kalkacak, önce yedeği alınacak.`,
    );
  } else if (secimler === "eskiyi-sil") {
    console.log(`${ortam}/${kodAdi} şu anki hâliyle kalacak, önceki veri silinecek.`);
  } else {
    dosya = secenek("dosya") ?? "";
    // Dosya kendiliğinden seçilmez: en yeni dosya boş sunucunun ya da bozuk hâlin yedeği olabilir.
    if (!dosya) {
      const liste = sunucudaCalistir(ipv4, yedekListesiBetigi(ortam, kodAdi)).trim();
      throw new Error(
        liste
          ? `Hangi yedeğe dönüleceğini seçin: --dosya=<ad>. Depodaki yedekler (tarih, boyut, ad):\n${liste}`
          : `${ortam}/${kodAdi} için depoda yedek yok.`,
      );
    }
    console.log(`${ortam}/${kodAdi} şu yedeğe dönecek: ${dosya}. Sonrasındaki veri kaybolur.`);
    if (process.argv.includes("--son-yedeksiz")) {
      console.log("O anki durumun yedeği ALINMAYACAK, önceki veri yerinde saklanacak.");
    }
  }
  let onay = secenek("onay");
  if (onay === undefined) {
    const soru = createInterface({ input: process.stdin, output: process.stdout });
    onay = await soru.question(`Onaylamak için sitenin kod adını yazın (${kodAdi}): `);
    soru.close();
  }
  if (onay !== kodAdi) throw new Error("Onaylanmadı, hiçbir şey yapılmadı.");
  if (secimler === "eskiye-don") {
    const dondu = await eskiyeDon(ipv4, ortam, kodAdi, console.log);
    console.log(
      dondu
        ? `Önceki veri yerinde: ${ortam}/${kodAdi}.`
        : "Dönülmedi: bekleyen önceki veri yok, canlı veritabanı olduğu gibi. Biten bir geri yüklemeyi geri almak için o işten önce alınan yedeğe dönün: --dosya=<...-geri-yukleme-oncesi.dump.age>",
    );
  } else if (secimler === "eskiyi-sil") {
    await eskiyiSil(ipv4, ortam, { kodAdi, numara }, console.log, {
      yedeksizOnay: process.argv.includes("--yedeksiz-onay"),
    });
    console.log(`Temizlendi: ${ortam}/${kodAdi}.`);
  } else {
    await geriYukle(ipv4, ortam, { kodAdi, numara }, dosya, undefined, console.log, {
      sonYedeksiz: process.argv.includes("--son-yedeksiz"),
    });
    console.log(`Geri yükleme bitti: ${ortam}/${kodAdi}, ${dosya}. Şifre yenilendi.`);
  }
} catch (hata) {
  console.error((hata as Error).message);
  process.exitCode = 1;
}
