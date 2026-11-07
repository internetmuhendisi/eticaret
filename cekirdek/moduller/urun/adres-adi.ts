// Ürünün okunur adres adı (kart 0076, karar 0062): vitrindeki adresin son parçası, örneğin
// "cicekli-sal". Yalnız küçük İngiliz harfleri, rakam ve tek tire olur (.claude/rules/klasor-duzeni.md).
//
// Ad verilmezse ürünün adından üretilir: aksanlar düşer, harf olmayanlar tireye döner. Üretim dile
// bağlı değildir; Unicode ayrıştırmasıyla düşmeyen birkaç harf aşağıdaki tabloda yazılıdır.
export const adresAdiKalibi = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const adresAdiUzunlugu = 100;

// Ayrıştırmayla (NFKD) temel harfe inmeyen harfler.
const ozelHarfler: Record<string, string> = {
  ı: "i",
  ß: "ss",
  æ: "ae",
  œ: "oe",
  ø: "o",
  đ: "d",
  ð: "d",
  ł: "l",
  þ: "th",
};

// Addan üretilen adres adı. Hiç harf ya da rakam kalmazsa (örneğin yalnız Latin dışı yazı) boş döner;
// servis o zaman ürünün kimliğinden üretir.
export const adresAdiUret = (ad: string): string =>
  ad
    .replaceAll("İ", "i")
    .toLowerCase()
    .replace(/[ıßæœøđðłþ]/g, (harf) => ozelHarfler[harf] ?? "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, adresAdiUzunlugu)
    .replace(/-+$/, "");
