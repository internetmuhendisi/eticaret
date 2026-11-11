// Demo sitenin verisini siler ve siteyi yayındaki sürümüyle boş veritabanından açar (kart 0128,
// karar 0100). Arka plan süreci açılırken başlangıç verisini (katalog, menüler, düzen) yeniden kurar.
//
//   pnpm site-sifirla <site klasörü> <ortam> [--onay=<kod adı>]
//
// Yalnız kimliğinde türü "demo" olan site sıfırlanır. Önce kutu durur ve o anki verinin yedeği alınır
// (dosya adı "-sifirlama-oncesi" ile biter); geri dönmek için: pnpm yedek-geri-yukle. Bir adım
// tutmazsa eski veri yerine döner. Yönetici hesapları da silinir: sonra pnpm sunucu-yonetici-ac.

import { createInterface } from "node:readline/promises";
import { siteKlasorunuDogrula } from "../cekirdek/ayar-semasi/site-klasoru.ts";
import { sifirla, sifirlamaEngeli } from "./yedek.mts";
import { secenek, yedekSitesi } from "./yedek-girdi.mts";

try {
  const { ipv4, ortam, kodAdi, numara } = yedekSitesi("site-sifirla");
  const klasor = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "";
  const sonuc = siteKlasorunuDogrula(klasor);
  if (!sonuc.gecerli) throw new Error(`${klasor} geçersiz`);
  const { tur } = sonuc.site.kimlik;
  const engel = sifirlamaEngeli({ kodAdi, tur });
  if (engel) throw new Error(engel);
  console.log(
    `${ortam}/${kodAdi} sıfırlanacak: bütün verisi (müşteriler, yöneticiler, ayarlar, ürünler) silinecek, önce yedeği alınacak.`,
  );
  let onay = secenek("onay");
  if (onay === undefined) {
    const soru = createInterface({ input: process.stdin, output: process.stdout });
    onay = await soru.question(`Onaylamak için sitenin kod adını yazın (${kodAdi}): `);
    soru.close();
  }
  if (onay !== kodAdi) throw new Error("Onaylanmadı, hiçbir şey yapılmadı.");
  await sifirla(ipv4, ortam, { kodAdi, tur, numara }, console.log);
  console.log(
    `Sıfırlandı: ${ortam}/${kodAdi}. Başlangıç verisi arka planda kuruluyor. Yönetici için: pnpm sunucu-yonetici-ac`,
  );
} catch (hata) {
  console.error((hata as Error).message);
  process.exitCode = 1;
}
