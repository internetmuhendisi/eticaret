// Kategorinin yolu (kart 0143, karar 0116): kategori, üst kategorilerinin adlarıyla ("Kadın › Tişört"), ağaç
// sırasıyla. Panelin kayıt araması ve vitrin bölümlerinin seçenekleri bunu kullanır: farklı üstlerdeki aynı adlı
// kategoriler ayırt edilir. Silinmiş üstü olan kategori en üstte sayılır.
export const kategoriYoluAyraci = " › ";

export const kategoriYollari = (
  kategoriler: readonly { kimlik: string; ad: string; ust: string | null }[],
): { kimlik: string; ad: string }[] => {
  const kimlikler = new Set(kategoriler.map((kategori) => kategori.kimlik));
  const altlari = new Map<string | null, (typeof kategoriler)[number][]>();
  for (const kategori of kategoriler) {
    const ust = kategori.ust !== null && kimlikler.has(kategori.ust) ? kategori.ust : null;
    altlari.set(ust, [...(altlari.get(ust) ?? []), kategori]);
  }
  const sonuc: { kimlik: string; ad: string }[] = [];
  const gez = (ust: string | null, yol: string[]) => {
    for (const kategori of altlari.get(ust) ?? []) {
      const ad = [...yol, kategori.ad];
      sonuc.push({ kimlik: kategori.kimlik, ad: ad.join(kategoriYoluAyraci) });
      gez(kategori.kimlik, ad);
    }
  };
  gez(null, []);
  return sonuc;
};
