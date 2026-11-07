// Arka plan süreci (kart 0031, karar 0013, 0049). Sitenin görüntüsünden ikinci bir kutu olarak
// başlar (/uygulama/arka-plan/surec.mjs). Kapatılınca yeni iş almaz, süren işi kısa süre bekler.
import { writeFileSync } from "node:fs";
import { siteyiAcilistaDogrula } from "../izleme/acilis.ts";
import { gunluk } from "../izleme/gunluk.ts";
import { hataIzlemeyiBagla } from "../izleme/hata-izleme-baglantisi.ts";
import { surecHatalariniBagla } from "../izleme/hata-katmani.ts";
import { konsoluGunlugeBagla } from "../izleme/konsol.ts";
import { kuyrukAyari, nabizDosyasi } from "../kayitlar/arka-plan.ts";
import { baglantiyiKapat, siteninVeritabani } from "../veritabani/baglanti.ts";
import { calistiriciKur } from "./calistirici.ts";
import { kayitliIsler, zamanliIsler } from "./isler.ts";

konsoluGunlugeBagla();
surecHatalariniBagla();
// Next.js'ten farklı olarak bu süreç yakalanmamış hatada kapanır. Hata kaydedilir (yukarıdaki
// dinleyici), kapanmadan önce gönderimin araca ulaşması beklenir; Docker kutuyu yeniden başlatır.
process.on("uncaughtException", () => {
  process.exitCode = 1;
  setTimeout(() => process.exit(1), kuyrukAyari.olumculBeklemeMs);
});
siteyiAcilistaDogrula();
hataIzlemeyiBagla();

const nabiz = () => {
  try {
    writeFileSync(nabizDosyasi, String(Date.now()));
  } catch (hata) {
    gunluk.uyari("arka plan nabzı yazılamadı", { hata });
  }
};
nabiz();
const nabizZamanlayici = setInterval(nabiz, kuyrukAyari.nabizMs);

const durdur = new AbortController();
for (const sinyal of ["SIGTERM", "SIGINT"] as const) {
  process.once(sinyal, () => {
    durdur.abort();
    setTimeout(() => process.exit(0), kuyrukAyari.kapanmaBeklemeMs).unref();
  });
}

gunluk.bilgi("arka plan süreci başladı");
await calistiriciKur({ vt: siteninVeritabani(), isler: kayitliIsler, zamanliIsler }).dongu(
  durdur.signal,
);
clearInterval(nabizZamanlayici);
await baglantiyiKapat();
gunluk.bilgi("arka plan süreci kapandı");
