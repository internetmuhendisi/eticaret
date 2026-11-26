// Testlerin "bu gizli değer metinde yok" denetimi (kart 0310).
// Kısa rakam dizisi (telefonun bir parçası, posta kodu) rastgele kimliklerde ve onaltılık özetlerde
// kendiliğinden geçebilir: "35b34454-a889-4555-…" kimliğinde "555" geçtiği için test kırmızı oldu
// (hat 45719023764). Sekizden az rakamlı değer bu yüzden yalnız harf ya da rakamla bitişik değilken
// sayılır; uzun değer ve rakam dışı değer düz aranır.

const kisaSayi = (deger: string) => /^[\d ]+$/.test(deger) && deger.replace(/ /g, "").length < 8;

const kacir = (deger: string) => deger.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const gizliGeciyor = (metin: string, deger: string): boolean =>
  kisaSayi(deger)
    ? new RegExp(`(?<![\\p{L}\\p{N}])${kacir(deger)}(?![\\p{L}\\p{N}])`, "u").test(metin)
    : metin.includes(deger);
