// Arka plan iş kuyruğunun durumları ve değerlerinin tek kaydı (kart 0031, karar 0049).
export const isDurumu = {
  bekliyor: "bekliyor",
  calisiyor: "calisiyor",
  bitti: "bitti",
  hata: "hata",
} as const;
export type IsDurumu = (typeof isDurumu)[keyof typeof isDurumu];

export const kuyrukAyari = {
  // Bir iş en çok bu kadar denenir; iş kendi tanımında farklı değer verebilir.
  enCokDeneme: 5,
  // Denemeler arası bekleme her seferinde iki katına çıkar, en uzun değerde durur.
  ilkGecikmeSaniye: 60,
  enUzunGecikmeSaniye: 3_600,
  // Bu süreyi aşan iş başarısız sayılır, kendisine durması söylenir.
  isSuresiSaniye: 300,
  // Süreç ölürse iş bu süreden sonra yeniden alınır. İş süresinden uzun olmalıdır.
  kilitSaniye: 360,
  // İş yokken kuyruğa bakma aralığı.
  bosBeklemeMs: 5_000,
  // Veritabanına ulaşılamazken bekleme bu değere kadar uzar.
  enUzunKesintiBeklemeMs: 60_000,
  zamanliKontrolMs: 30_000,
  nabizMs: 10_000,
  // Kapatılırken süren iş bu kadar beklenir. Docker'ın durdurma süresinden (10 sn) kısadır.
  kapanmaBeklemeMs: 8_000,
  // Süreci düşüren hatanın araca ulaşması için kapanmadan önce beklenen süre.
  olumculBeklemeMs: 2_000,
  // Biten işler bu süre sonra silinir: girdileri kişisel bilgi taşıyabilir. Hatalı işler kalır.
  bitenSaklamaGun: 30,
  hataOzetiUzunlugu: 500,
} as const;

export type KuyrukAyari = { [Alan in keyof typeof kuyrukAyari]: number };

// Süreç açılış kurulumunu (katalog, sayfalar, menüler, düzen, blog) bitirip kuyruğu çalıştırmaya
// başlarken günlüğe bu satırı yazar (kart 0309). Kuyruk kurulum bitmeden iş almaz; yerel ortam denemesi
// kuyruğu ölçmeden önce bu satırı bekler. Satır bu sürümle gelir, eski görüntüde beklenmez.
export const kuyrukBasladiMesaji = "arka plan kuyruğu başladı";
export const kuyrukBasladiIlkSurum = [0, 80, 0] as const;

// Sürecin canlı olduğunu kutunun sağlık yoklamasına söyleyen dosya. Kutunun tek yazılabilir yeri /tmp'dir.
export const nabizDosyasi = "/tmp/arka-plan-nabiz";
export const nabizSiniriMs = 60_000;

// Görüntüdeki dosyalar: Dockerfile bunları üretir, kutu tanımı ve deneme komutu buradan okur.
export const arkaPlanDosyalari = {
  surec: "arka-plan/surec.mjs",
  deneme: "arka-plan/deneme.mjs",
} as const;

// Deneme işlerinin yalnız kutunun içinden tetiklenen işareti: küçük harfler.
export const denemeIsaretiBicimi = /^[a-z]{12,32}$/;
