// Marka girdisinin şemaları ve hata metinleri (kart 0078, karar 0064). Şemalar marka ve etikette
// ortaktır (cekirdek/moduller/urun/grup-semalari.ts). Açıklaması girilir.
import type { MetinAnahtari } from "../../metinler/metin.ts";
import { type GrupHatasi, grupDegisikligi, grupGirdisi } from "../urun/grup-semalari.ts";

export const markaGirdisi = grupGirdisi({ aciklama: true, logo: true });
export const markaDegisikligi = grupDegisikligi({ aciklama: true, logo: true });

// Her hata kodunun ekran metni: eksik metin tür kontrolünde hata verir.
export const markaHataMetinleri = {
  "kayda-uygun-degil": "yonetim.marka.hata.kayda-uygun-degil",
  "adres-adi-bicimi": "yonetim.marka.hata.adres-adi-bicimi",
  "adres-adi-tekrar": "yonetim.marka.hata.adres-adi-tekrar",
  "ad-tekrar": "yonetim.marka.hata.ad-tekrar",
  "gorsel-gecersiz": "yonetim.marka.hata.gorsel-gecersiz",
} as const satisfies Record<GrupHatasi, MetinAnahtari>;
