// Bölüm metnindeki yer tutucuları doldurur (kart 0110, cekirdek/kayitlar/yer-tutucular.ts). Kayıtta olmayan ya
// da değeri olmayan bir yer tutucu varsa metin yoktur: bölüm o maddeyi çizmez.
const kalip = /\{([a-zA-Z]+)\}/g;

export const yerTutuculariDoldur = (
  metin: string,
  degerler: Readonly<Record<string, string>>,
): string | undefined => {
  let eksik = false;
  const sonuc = metin.replace(kalip, (_, ad: string) => {
    const deger = Object.hasOwn(degerler, ad) ? degerler[ad] : undefined;
    if (deger === undefined) eksik = true;
    return deger ?? "";
  });
  return eksik ? undefined : sonuc;
};
