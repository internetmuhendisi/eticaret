// Ürün kartının görünümü (kart 0109, karar 0085): bölüm kendi görünüm seçeneğiyle seçtiyse o, seçmediyse
// temanın seçimi. Temanın seçimi tema şemasından geçmiştir (cekirdek/temalar/sema.ts); kayıtta olmayan bir
// değer yine de gelirse (eski sürüm) kaydın ilk görünümü çizilir, kart düşmez.
import { type UrunKartiGorunumu, urunKartiGorunumleri } from "../../kayitlar/tema.ts";

const urunKartiGorunumuMu = (deger: unknown): deger is UrunKartiGorunumu =>
  typeof deger === "string" && (urunKartiGorunumleri as readonly string[]).includes(deger);

export const urunKartiGorunumu = (
  temaninGorunumleri: Readonly<Record<string, string>>,
  bolumunSecimi?: string,
): UrunKartiGorunumu => {
  if (urunKartiGorunumuMu(bolumunSecimi)) return bolumunSecimi;
  const temanin = temaninGorunumleri["urun-karti"];
  return urunKartiGorunumuMu(temanin) ? temanin : urunKartiGorunumleri[0];
};
