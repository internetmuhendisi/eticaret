// Stok değişikliği sebeplerinin tek kaydı (kart 0082, karar 0068, .claude/rules/kayit-dosyalari.md).
// Sebep adı stok geçmişine yazılır: yayınlandıktan sonra ancak eski kayıtları dönüştüren bir veri
// değişikliğiyle değişir. Veritabanındaki denetim (stok_gecmisi_sebep) bu listeyle aynıdır, bunu
// cekirdek/moduller/stok/testler/servis.test.ts denetler.
//
// - elle: panelden elle düzeltmede seçilebilir (kullanıcı kararı: beş sebep). Notu zorunlu olan
//   sebepte (notZorunlu) not yazılmadan düzeltme kaydedilmez.
// - yon: sebebin stoğu hangi işlevle değiştirdiği. "dus" sipariş oluşurken, "artir" iptal ve iadede
//   çalışır; elle düzeltmenin yönü yoktur, yeni miktar verilir.
export const stokSebepleri = {
  sayim: { elle: true, notZorunlu: false, yon: null },
  "yeni-mal": { elle: true, notZorunlu: false, yon: null },
  "hasarli-kayip": { elle: true, notZorunlu: false, yon: null },
  "iade-edilen": { elle: true, notZorunlu: false, yon: null },
  diger: { elle: true, notZorunlu: true, yon: null },
  siparis: { elle: false, notZorunlu: false, yon: "dus" },
  "siparis-iptali": { elle: false, notZorunlu: false, yon: "artir" },
  "siparis-iadesi": { elle: false, notZorunlu: false, yon: "artir" },
} as const satisfies Record<
  string,
  { elle: boolean; notZorunlu: boolean; yon: "dus" | "artir" | null }
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
