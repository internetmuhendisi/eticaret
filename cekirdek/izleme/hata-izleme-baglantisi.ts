// Hata izleme aracının sunucuda bağlanması (kart 0022, karar 0036). Uygulama açılırken bir kez
// çağrılır (instrumentation.ts). Gönderim adresi yoksa (bilgisayarda, testte) araç bağlanmaz ve
// hatalar yalnız günlüğe yazılır. Tarayıcıdaki karşılığı: istemci-hata-izleme.tsx.
import { calisanSite } from "../ayar-semasi/calisan-site.ts";
import { cekirdekSurumu } from "../surum.ts";
import { gunluk } from "./gunluk.ts";
import {
  type HataIzlemeBilgisi,
  hataIzlemeAraciKur,
  hataIzlemeDegiskenleri,
} from "./hata-izleme-araci.ts";
import { hataIzlemeAraciniBagla } from "./hata-katmani.ts";

// Sitenin hata izleme bilgisi: tarayıcıya da bu gider (kök düzen). Adres yoksa undefined.
export const hataIzlemeBilgisi = (): HataIzlemeBilgisi | undefined => {
  const adres = process.env[hataIzlemeDegiskenleri.adres];
  const ortam = process.env[hataIzlemeDegiskenleri.ortam];
  if (!adres || !ortam) return undefined;
  return { adres, ortam, site: calisanSite().kimlik.kodAdi, surum: cekirdekSurumu };
};

// Dönen değer: araç bağlandı mı. Adres verilmiş ama bozuksa günlüğe uyarı yazılır.
export const hataIzlemeyiBagla = (bilgi = hataIzlemeBilgisi()): boolean => {
  if (bilgi === undefined) return false;
  const gonder = hataIzlemeAraciKur(bilgi, {
    kaynak: "sunucu",
    basarisiz: (neden) => gunluk.uyari("hata izleme aracı hatayı alamadı", { hata: neden }),
  });
  if (gonder === undefined) {
    gunluk.uyari("hata izleme adresi geçersiz, araç bağlanmadı");
    return false;
  }
  hataIzlemeAraciniBagla(({ hata, baglam, seviye }) => gonder(hata, baglam, seviye));
  return true;
};
