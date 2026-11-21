// Stok bildirimleri listesinin tanımı (kart 0258; kart 0144'ün ekranı liste motoruna taşındı). Bekleyen talebi olan
// birimler: ürün adında arama (adreste), iki sıralama, sayfasız (en çok stokBildirimiAyari.panelSiniri birim), toplu
// işlem yok. Sunucuda ve tarayıcıda çalışır.

import { stokBildirimiSiralamalari } from "../../../kayitlar/eklentiler";
import { aramaSinirlari } from "../../../kayitlar/liste";
import { panelAdresi } from "../../../yonetim-paneli/adresler";
import type { ListeTanimi } from "../../../yonetim-paneli/liste/tanim";

export const stokBildirimleriListesiTanimi = {
  kod: "stok-bildirimleri",
  adres: `${panelAdresi}/stok-bildirimleri`,
  suzgecler: [],
  arama: { enCok: aramaSinirlari.metin, adreste: true },
  siralamalar: stokBildirimiSiralamalari,
  sayfali: false,
  siralanabilirSutunlar: {},
  topluIslemler: [],
} as const satisfies ListeTanimi;
