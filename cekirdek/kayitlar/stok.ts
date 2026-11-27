// Stokun kayıtları (.claude/rules/kayit-dosyalari.md): değişiklik sebepleri (kart 0082, karar 0068),
// tükenen ürünün davranışı ve müşteriye yazılan durum (kart 0083, karar 0069).
//
// Değişiklik sebepleri:
// Sebep adı stok geçmişine yazılır: yayınlandıktan sonra ancak eski kayıtları dönüştüren bir veri
// değişikliğiyle değişir. Veritabanındaki denetim (stok_gecmisi_sebep) bu listeyle aynıdır, bunu
// cekirdek/moduller/stok/testler/servis.test.ts denetler.
//
// - elle: panelden elle düzeltmede seçilebilir (kullanıcı kararı: beş sebep). Notu zorunlu olan
//   sebepte (notZorunlu) not yazılmadan düzeltme kaydedilmez.
// - yon: sebebin stoğu hangi işlevle değiştirdiği. "dus" sipariş oluşurken, "artir" iptal ve iadede
//   çalışır; elle düzeltmenin yönü yoktur, yeni miktar verilir.
// - arac: panelin bir aracının düzeltmesi (kart 0315: Excel ile içe aktarma); elle seçilemez, yeni miktar verilir,
//   aracın kendisi sebebi yazar (aracDuzeltmesi).
export const stokSebepleri = {
  sayim: { elle: true, notZorunlu: false, yon: null, arac: false },
  "yeni-mal": { elle: true, notZorunlu: false, yon: null, arac: false },
  "hasarli-kayip": { elle: true, notZorunlu: false, yon: null, arac: false },
  "iade-edilen": { elle: true, notZorunlu: false, yon: null, arac: false },
  diger: { elle: true, notZorunlu: true, yon: null, arac: false },
  siparis: { elle: false, notZorunlu: false, yon: "dus", arac: false },
  "siparis-iptali": { elle: false, notZorunlu: false, yon: "artir", arac: false },
  "siparis-iadesi": { elle: false, notZorunlu: false, yon: "artir", arac: false },
  "excel-ice-aktarma": { elle: false, notZorunlu: false, yon: null, arac: true },
} as const satisfies Record<
  string,
  { elle: boolean; notZorunlu: boolean; yon: "dus" | "artir" | null; arac: boolean }
>;
export type StokSebebi = keyof typeof stokSebepleri;
export const stokSebepAdlari = Object.keys(stokSebepleri) as StokSebebi[];

type Yonlu<Yon> = {
  [Ad in StokSebebi]: (typeof stokSebepleri)[Ad]["yon"] extends Yon ? Ad : never;
}[StokSebebi];
export type ElleStokSebebi = {
  [Ad in StokSebebi]: (typeof stokSebepleri)[Ad]["elle"] extends true ? Ad : never;
}[StokSebebi];
export type DusmeSebebi = Yonlu<"dus">;
export type ArtirmaSebebi = Yonlu<"artir">;

export const elleStokSebepleri = stokSebepAdlari.filter(
  (ad) => stokSebepleri[ad].elle,
) as ElleStokSebebi[];
export type AracStokSebebi = {
  [Ad in StokSebebi]: (typeof stokSebepleri)[Ad]["arac"] extends true ? Ad : never;
}[StokSebebi];
export const aracStokSebepleri = stokSebepAdlari.filter(
  (ad) => stokSebepleri[ad].arac,
) as AracStokSebebi[];

// Tükenen ürünün vitrindeki davranışı (kart 0083, karar 0069). Mağaza sahibinin ayarıdır (tukenenUrun).
// - goster: ürün listelerde görünür, satılamaz.
// - gizle: ürün listelerden, aramadan ve ilgili ürünlerden çıkar; kendi sayfası bağlantıyla açılır ve
//   satılamaz (kullanıcı kararı). Stok gelince listelere kendiliğinden döner.
export const tukenenUrunDavranislari = ["goster", "gizle"] as const;
export type TukenenUrunDavranisi = (typeof tukenenUrunDavranislari)[number];

// Müşteriye yazılan stok durumu (kart 0083). Metinleri cekirdek/moduller/stok/semalar.ts'de.
// - tukendi: takip açık, stok yok.
// - son-adet: stok "son X ürün" eşiğine (sonAdetEsigi) eşit ya da altında.
// - stokta: stok eşiğin üstünde ya da takip kapalı.
export const stokGosterimleri = ["tukendi", "son-adet", "stokta"] as const;
export type StokGosterimi = (typeof stokGosterimleri)[number];
