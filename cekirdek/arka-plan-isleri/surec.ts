// Arka plan süreci (kart 0031, karar 0013, 0049). Sitenin görüntüsünden ikinci bir kutu olarak
// başlar (/uygulama/arka-plan/surec.mjs). Kapatılınca yeni iş almaz, süren işi kısa süre bekler.
import { writeFileSync } from "node:fs";
import { calisanSite } from "../ayar-semasi/calisan-site.ts";
import { siteyiAcilistaDogrula } from "../izleme/acilis.ts";
import { gunluk } from "../izleme/gunluk.ts";
import { hataIzlemeyiBagla } from "../izleme/hata-izleme-baglantisi.ts";
import { hatayiKaydet, surecHatalariniBagla } from "../izleme/hata-katmani.ts";
import { konsoluGunlugeBagla } from "../izleme/konsol.ts";
import { kuyrukAyari, nabizDosyasi } from "../kayitlar/arka-plan.ts";
import { duzenServisi } from "../moduller/duzen/servis.ts";
import { menuBaslangiciniKur } from "../moduller/menu/baslangic.ts";
import { katalogBaslangiciniKur } from "../moduller/urun/baslangic.ts";
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
// Sitenin başlangıç kataloğu, katalog hiç kurulmamışsa bir kez yazılır (kart 0084). Yazılamazsa hiçbir
// parçası yazılmaz; hata kaydedilir, kuyruk yine çalışır, sonraki açılışta yeniden denenir.
let katalogHazir = false;
try {
  if (await katalogBaslangiciniKur(siteninVeritabani(), calisanSite())) {
    gunluk.bilgi("başlangıç kataloğu yazıldı");
  } else {
    gunluk.bilgi("başlangıç kataloğu yazılmadı: dosya boş ya da katalog kurulu");
  }
  katalogHazir = true;
} catch (hata) {
  hatayiKaydet(hata, { kaynak: "katalog-baslangici" });
}
// Başlangıç menüleri kataloğa bağlanır (kart 0107): katalog bu açılışta yazılamadıysa menüler de yazılmaz,
// sonraki açılışta ikisi birlikte yeniden denenir; yoksa menü bağlanacağı kaydı bulamadan bir kez yazılırdı.
if (katalogHazir) {
  try {
    if (await menuBaslangiciniKur(siteninVeritabani(), calisanSite())) {
      gunluk.bilgi("başlangıç menüleri yazıldı");
    } else {
      gunluk.bilgi("başlangıç menüleri yazılmadı: dosya boş ya da menüler kurulu");
    }
  } catch (hata) {
    hatayiKaydet(hata, { kaynak: "menu-baslangici" });
  }
  // Başlangıç düzeni katalogdaki kategori, marka ve ürünlere bağlanır (kart 0114): katalogdan ve menülerden
  // sonra kurulur. Vitrin daha önce açılırsa düzeni boş görür, yazmaz.
  try {
    if (await duzenServisi(calisanSite).baslangiciKur(siteninVeritabani())) {
      gunluk.bilgi("başlangıç düzeni yazıldı");
    } else {
      gunluk.bilgi("başlangıç düzeni yazılmadı: düzen kurulu");
    }
  } catch (hata) {
    hatayiKaydet(hata, { kaynak: "duzen-baslangici" });
  }
}
await calistiriciKur({ vt: siteninVeritabani(), isler: kayitliIsler, zamanliIsler }).dongu(
  durdur.signal,
);
clearInterval(nabizZamanlayici);
await baglantiyiKapat();
gunluk.bilgi("arka plan süreci kapandı");
