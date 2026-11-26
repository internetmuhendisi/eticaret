// Testlerin "bu gizli değer metinde yok" denetimi (kart 0310).
// Kısa rakam dizisi (telefonun bir parçası, posta kodu) rastgele kimliklerde ve onaltılık özetlerde
// kendiliğinden geçebilir: "35b34454-a889-4555-…" kimliğinde "555" geçtiği için test kırmızı oldu
// (hat 45719023764). Rakam değeri bu yüzden şöyle aranır:
// - Değerdeki boşluk, metinde herhangi bir ayraç ya da hiç ayraç olabilir ("555 123 45 67";
//   "555-123-45-67", "(555) 123", bölünmez boşluk ve "5551234567" de yakalanır).
// - Sekizden az rakamlı değer yalnız harf ya da rakamla bitişik değilken sayılır.
// Rakam dışı değer düz aranır.

const kacir = (deger: string) => deger.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const ayrac = "[^\\p{L}\\p{N}]*";
const sinir = { once: "(?<![\\p{L}\\p{N}])", sonra: "(?![\\p{L}\\p{N}])" };

const sayiKalibi = (deger: string): RegExp | undefined => {
  if (!/^[\d ]+$/.test(deger.trim())) return undefined;
  const gruplar = deger.trim().split(/ +/);
  const govde = gruplar.map(kacir).join(ayrac);
  const kisa = gruplar.join("").length < 8;
  return new RegExp(kisa ? `${sinir.once}${govde}${sinir.sonra}` : govde, "u");
};

export const gizliGeciyor = (metin: string, deger: string): boolean => {
  const kalip = sayiKalibi(deger);
  return kalip === undefined ? metin.includes(deger) : kalip.test(metin);
};
