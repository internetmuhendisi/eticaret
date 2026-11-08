// Stok girdilerinin ortak şemaları (kart 0082, karar 0068). Panelin ekranı ve uçlar aynı şemayı kullanır.
//
// Elle düzeltme yeni miktarı verir (sayımdaki gibi), ekranın o an gördüğü miktarla birlikte: arada bir
// sipariş stoğu değiştirdiyse düzeltme reddedilir, sessizce üstüne yazılmaz.
//
// Hata iletileri düz cümle değil koddur (stokHatalari); metni ekran çözer.
import { z } from "zod";
import { elleStokSebepleri, type StokSebebi } from "../../kayitlar/stok.ts";
import type { MetinAnahtari } from "../../metinler/metin.ts";
import { kayitDegeriYasakMi, kayitMetniHatasi } from "../degisiklik-kaydi/deger.ts";

export const stokHatalari = [
  "miktar-bicimi",
  "adet-bicimi",
  // Miktar ya da artırmanın sonucu üst sınırı (enCokStok) aşıyor.
  "miktar-siniri",
  "not-uzun",
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
  "miktar-siniri": "yonetim.stok.hata.miktar-siniri",
  "not-uzun": "yonetim.stok.hata.not-uzun",
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

// Miktarın üst sınırı: veritabanındaki tam sayının (2^31 - 1) altında, iki sınırın toplamı da taşmaz.
// Veritabanındaki denetim (birim_stoklari_miktar) aynı sayıyı kullanır, testle denetlenir. Servis
// toplanmış adedi ve artırmanın sonucunu da bu sınırla denetler (kart 0082 kontrolü).
export const enCokStok = 1_000_000_000;

const miktar = z
  .int(hata("miktar-bicimi"))
  .min(0, hata("miktar-bicimi"))
  .max(enCokStok, hata("miktar-siniri"));
const adet = z
  .int(hata("adet-bicimi"))
  .min(1, hata("adet-bicimi"))
  .max(enCokStok, hata("miktar-siniri"));

export const notUzunlugu = 500;

// Boş ya da yalnız boşluklu not yazılmamış sayılır: "diğer"de "not-gerekli" alır (kart 0082 kontrolü).
// Kurallar kayitMetni ile aynıdır (kırpılır, kayda yazılamayan değer olamaz, NFC); her sorun ekranın
// tanıdığı tek bir kodla döner.
const not = z.string().transform((deger, ctx) => {
  const temiz = deger.trim();
  if (temiz === "") return undefined;
  const kod =
    temiz.length > notUzunlugu
      ? hata("not-uzun")
      : kayitDegeriYasakMi(temiz)
        ? hata(kayitMetniHatasi)
        : undefined;
  if (kod === undefined) return temiz.normalize("NFC");
  ctx.addIssue({ code: "custom", message: kod });
  return z.NEVER;
});

export const elleDuzeltme = z.strictObject({
  yeniMiktar: miktar,
  // Ekranın düzeltmeden önce gösterdiği miktar.
  gorulenMiktar: miktar,
  sebep: z.enum(elleStokSebepleri),
  not: not.optional(),
});
export type ElleDuzeltme = z.input<typeof elleDuzeltme>;

// Düşürme ve artırmanın kalemleri: aynı birim birden çok kez gelebilir, servis toplar.
export const stokKalemleri = z
  .array(z.strictObject({ birim: z.string(), adet }))
  .min(1)
  .max(500);
export type StokKalemi = z.input<typeof stokKalemleri>[number];
