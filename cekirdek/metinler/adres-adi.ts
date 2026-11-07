// Okunur adres adının tek tanımı (kart 0076, karar 0062; kategori kart 0077): vitrindeki adresin son
// parçası, örneğin "cicekli-sal". Yalnız küçük İngiliz harfleri, rakam ve tek tire olur
// (.claude/rules/klasor-duzeni.md). Ürün ve kategori aynı kuralı kullanır.
//
// Ad verilmezse kaydın adından üretilir: aksanlar düşer, harf olmayanlar tireye döner. Üretim dile
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
// bosAdresAdi o zaman kaydın kimliğinden üretir.
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

// Addan üretilen ve kullanılmayan adres adı. Kullanılıyorsa sonuna sayı eklenir: cicekli-sal-2,
// cicekli-sal-3... Addan hiç harf kalmazsa kimliğin ilk parçası kullanılır. Uzun kökte sayılı aday kökü
// kısaltır; bu yüzden adaylar önekle değil tek tek, elli elli sorulur (kullanilanlar tek sorgu atar).
// Çağıran yarışı kilitle önler.
export const bosAdresAdi = async (
  ad: string,
  kimlik: string,
  kullanilanlar: (adaylar: string[]) => Promise<Set<string>>,
): Promise<string> => {
  const uretilen = adresAdiUret(ad);
  const kok = uretilen === "" ? (kimlik.split("-")[0] ?? kimlik) : uretilen;
  const aday = (sayi: number) => {
    if (sayi === 1) return kok;
    const ek = `-${sayi}`;
    return `${kok.slice(0, adresAdiUzunlugu - ek.length).replace(/-+$/, "")}${ek}`;
  };
  for (let ilk = 1; ; ilk += 50) {
    const adaylar = Array.from({ length: 50 }, (_, sira) => aday(ilk + sira));
    const kullanilan = await kullanilanlar(adaylar);
    const bos = adaylar.find((adresAdi) => !kullanilan.has(adresAdi));
    if (bos !== undefined) return bos;
  }
};
