// Ürün bölümlerinin ortak alanları (kart 0111, karar 0088): ürün kartının görünümü ve yan afiş. Ürün
// vitrini, sekmeli vitrin ve fırsatlar aynı alanları kullanır; tarifte bir kez yazılır.
import type { SecimSecenegi, TekAlanTarifi } from "../../bolum-kutuphanesi/tarif.ts";

// Kartın görünümü: "tema" temanın seçtiği görünümdür (vitrin bağlamındaki parcaGorunumleri), ötekiler
// ürün kartının görünümleri (cekirdek/kayitlar/tema.ts). Seçenekler kayıtla aynıdır (testte).
export const kartGorunumuAlani = {
  tur: "secim",
  ad: "vitrin.bolum.urun.kartGorunumu",
  secenekler: [
    { kod: "tema", ad: "vitrin.bolum.urun.temaninKarti" },
    { kod: "dikey", ad: "vitrin.bolum.urun.kart.dikey" },
    { kod: "yatay", ad: "vitrin.bolum.urun.kart.yatay" },
    { kod: "buyuk-gorsel", ad: "vitrin.bolum.urun.kart.buyukGorsel" },
  ] as const satisfies readonly [SecimSecenegi, ...SecimSecenegi[]],
  varsayilan: "tema",
} as const satisfies TekAlanTarifi;

// "Tümünü gör" bağlantısı: başlığın yanında durur, yazısı sabittir (metin dosyası).
export const tumuBaglantisiAlani = {
  tur: "baglanti",
  ad: "vitrin.bolum.urun.tumuBaglantisi",
} as const satisfies TekAlanTarifi;

// Yan afiş (Canlı Çarşı taslağının "Yeni gelenler" bölümü): başlığı verilirse ürünlerin solunda görsel,
// başlık, metin ve düğmeyle durur; telefonda ürünlerin üstüne iner.
export const yanAfisAlanlari = {
  yanBaslik: { tur: "metin", ad: "vitrin.bolum.urun.yanBaslik", enCok: 60 },
  yanMetin: { tur: "uzun-metin", ad: "vitrin.bolum.urun.yanMetin", enCok: 200 },
  yanGorsel: { tur: "gorsel", ad: "vitrin.bolum.urun.yanGorsel" },
  yanGorselMetni: { tur: "metin", ad: "vitrin.bolum.alan.gorselMetni", enCok: 160 },
  yanDugmeYazisi: { tur: "metin", ad: "vitrin.bolum.alan.dugmeYazisi", enCok: 30 },
  yanBaglanti: { tur: "baglanti", ad: "vitrin.bolum.alan.baglanti" },
  yanZemin: {
    tur: "renk",
    ad: "vitrin.bolum.alan.zemin",
    renkler: ["yuzey", "afis", "alt-kisim", "kutu-1", "kutu-2", "kutu-3", "kutu-4", "kutu-5"],
  },
} as const satisfies Readonly<Record<string, TekAlanTarifi>>;
