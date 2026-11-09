// Etiket girdisinin şemaları ve hata metinleri (kart 0078, karar 0064). Şemalar marka ve etikette
// ortaktır (cekirdek/moduller/urun/grup-semalari.ts). Açıklaması girilmez (kart 0078).
import type { MetinAnahtari } from "../../metinler/metin.ts";
import { type GrupHatasi, grupDegisikligi, grupGirdisi } from "../urun/grup-semalari.ts";

export const etiketGirdisi = grupGirdisi({ aciklama: false, logo: false });
export const etiketDegisikligi = grupDegisikligi({ aciklama: false, logo: false });

// Her hata kodunun ekran metni: eksik metin tür kontrolünde hata verir.
export const etiketHataMetinleri = {
  "kayda-uygun-degil": "yonetim.etiket.hata.kayda-uygun-degil",
  "adres-adi-bicimi": "yonetim.etiket.hata.adres-adi-bicimi",
  "adres-adi-tekrar": "yonetim.etiket.hata.adres-adi-tekrar",
  "ad-tekrar": "yonetim.etiket.hata.ad-tekrar",
  "gorsel-gecersiz": "yonetim.etiket.hata.gorsel-gecersiz",
} as const satisfies Record<GrupHatasi, MetinAnahtari>;
