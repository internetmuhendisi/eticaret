// Stok girdilerinin ortak şemaları (kart 0082, karar 0068). Panelin ekranı ve uçlar aynı şemayı kullanır.
//
// Elle düzeltme yeni miktarı verir (sayımdaki gibi), ekranın o an gördüğü miktarla birlikte: arada bir
// sipariş stoğu değiştirdiyse düzeltme reddedilir, sessizce üstüne yazılmaz.
//
// Hata iletileri düz cümle değil koddur (stokHatalari); metni ekran çözer.
import { z } from "zod";
import { elleStokSebepleri, type StokSebebi } from "../../kayitlar/stok.ts";
import type { MetinAnahtari } from "../../metinler/metin.ts";
import { kayitMetni, kayitMetniHatasi } from "../degisiklik-kaydi/deger.ts";

export const stokHatalari = [
  "miktar-bicimi",
  "adet-bicimi",
  // Düşürmede birimin stoğu yetmiyor.
  "stok-yetersiz",
  // Düşürmede birim ya da ürünü silinmiş: satılamaz.
  "birim-gecersiz",
  // Elle düzeltmede ekranın gördüğü miktar artık doğru değil.
  "stok-degisti",
  // Notu zorunlu sebepte not yok.
  "not-gerekli",
  kayitMetniHatasi,
] as const;
export type StokHatasi = (typeof stokHatalari)[number];

// Her hata kodunun ekran metni: eksik metin tür kontrolünde hata verir.
export const stokHataMetinleri = {
  "miktar-bicimi": "yonetim.stok.hata.miktar-bicimi",
  "adet-bicimi": "yonetim.stok.hata.adet-bicimi",
  "stok-yetersiz": "yonetim.stok.hata.stok-yetersiz",
  "birim-gecersiz": "yonetim.stok.hata.birim-gecersiz",
  "stok-degisti": "yonetim.stok.hata.stok-degisti",
  "not-gerekli": "yonetim.stok.hata.not-gerekli",
  "kayda-uygun-degil": "yonetim.stok.hata.kayda-uygun-degil",
} as const satisfies Record<StokHatasi, MetinAnahtari>;

// Her sebebin ekran metni: eksik metin tür kontrolünde hata verir.
export const stokSebepMetinleri = {
  sayim: "yonetim.stok.sebep.sayim",
  "yeni-mal": "yonetim.stok.sebep.yeni-mal",
  "hasarli-kayip": "yonetim.stok.sebep.hasarli-kayip",
  "iade-edilen": "yonetim.stok.sebep.iade-edilen",
  diger: "yonetim.stok.sebep.diger",
  siparis: "yonetim.stok.sebep.siparis",
  "siparis-iptali": "yonetim.stok.sebep.siparis-iptali",
  "siparis-iadesi": "yonetim.stok.sebep.siparis-iadesi",
} as const satisfies Record<StokSebebi, MetinAnahtari>;

const hata = (kod: StokHatasi) => kod;

// Miktarın üst sınırı: veritabanındaki tam sayının (2^31 - 1) çok altında, artırmada taşmasın.
export const enCokStok = 1_000_000_000;

const miktar = z.int(hata("miktar-bicimi")).min(0, hata("miktar-bicimi")).max(enCokStok);
const adet = z.int(hata("adet-bicimi")).min(1, hata("adet-bicimi")).max(enCokStok);

export const elleDuzeltme = z.strictObject({
  yeniMiktar: miktar,
  // Ekranın düzeltmeden önce gösterdiği miktar.
  gorulenMiktar: miktar,
  sebep: z.enum(elleStokSebepleri),
  not: kayitMetni(500).optional(),
});
export type ElleDuzeltme = z.input<typeof elleDuzeltme>;

// Düşürme ve artırmanın kalemleri: aynı birim birden çok kez gelebilir, servis toplar.
export const stokKalemleri = z
  .array(z.strictObject({ birim: z.string(), adet }))
  .min(1)
  .max(500);
export type StokKalemi = z.input<typeof stokKalemleri>[number];
