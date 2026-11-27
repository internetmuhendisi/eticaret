// Excel dosyasının düzeni (kart 0315, karar 0185): tek sayfa, her birleşim bir satır, basit ürün tek satır. Ürünün
// ortak bilgileri birleşimlerinin her satırında tekrarlanır. İkinci sayfa ("Bilgi") dışa aktarmanın kimliğini taşır.
//
// Hücrenin değeri karşılaştırmada "düz değer"e çevrilir: metin kırpılmış ve NFC, tutar kuruş, stok tam sayı, tarih
// sitenin saat diliminde "2026-12-08 23:59". Dışa aktarılan dosyanın değerleri, indirildiği andaki değerler ve
// yüklenen dosyanın hücreleri aynı düz değerlerle karşılaştırılır.
//
// Yüklenen hücre:
// - boş: alan değişmez (karar 0185);
// - "-": alan boşalır (yalnız boşalabilen alanlarda; öteki alanda hatalı satır);
// - değer: düz değere çevrilir, çevrilemezse hatalı satır.

export const sutunlar = [
  "urunKodu",
  "ad",
  "secenekler",
  "stokKodu",
  "barkod",
  "satisFiyati",
  "indirimliFiyat",
  "indirimBaslangici",
  "indirimBitisi",
  "stok",
  "durum",
  "kategoriler",
  "marka",
  "etiketler",
  "ozellikler",
] as const;
export type Sutun = (typeof sutunlar)[number];

// Ürünün ortak bilgileri (her satırda tekrarlanır) ve birimin kendi bilgileri.
export const ortakSutunlar = [
  "ad",
  "durum",
  "kategoriler",
  "marka",
  "etiketler",
  "ozellikler",
] as const satisfies readonly Sutun[];
export type OrtakSutun = (typeof ortakSutunlar)[number];
export const birimSutunlari = [
  "stokKodu",
  "barkod",
  "satisFiyati",
  "indirimliFiyat",
  "indirimBaslangici",
  "indirimBitisi",
  "stok",
] as const satisfies readonly Sutun[];
export type BirimSutunu = (typeof birimSutunlari)[number];
export const fiyatSutunlari = [
  "satisFiyati",
  "indirimliFiyat",
  "indirimBaslangici",
  "indirimBitisi",
] as const satisfies readonly BirimSutunu[];
export type FiyatSutunu = (typeof fiyatSutunlari)[number];

// "-" ile boşalabilen alanlar. Ad, durum, satış fiyatı ve stok boşalamaz.
export const bosalabilenSutunlar: readonly Sutun[] = [
  "stokKodu",
  "barkod",
  "indirimliFiyat",
  "indirimBaslangici",
  "indirimBitisi",
  "kategoriler",
  "marka",
  "etiketler",
  "ozellikler",
];

// Hücrenin boşaltma işareti.
export const silmeIsareti = "-";
// Bir hücredeki liste öğelerinin ayracı (kategoriler, etiketler, özellikler, seçenekler) ve "Ad: değer" ayracı.
export const listeAyraci = ";";
export const adDegerAyraci = ":";
// Kategorinin yolu ("Giyim › Kadın"); panelin kategori yolu da bu ayraçla yazılır.
export const yolAyraci = " › ";

// Düz değerler: alan adından düz değere (metin). Olmayan alan dosyada yazılmamıştır.
export type DuzOrtak = Record<OrtakSutun, string>;
export type DuzBirim = { [S in BirimSutunu]?: string };

// Dışa aktarmanın kaydındaki indirildiği andaki değerler: ürünün ve birimin kimliğiyle.
// kodlar: ürün kodu (adres adı) → ürünün kimliği; anahtarlar: birimAnahtari → birimin kimliği. Dosyanın satırı
// indirildiği andaki ürüne ve birime bunlarla bağlanır: sonradan sitede silinen ya da kodu başka ürüne geçen ürün,
// silinen ya da değeri yeniden adlandırılan birleşim tanınır (kart 0315, bağımsız kontrolün bulgusu).
export type IndirilenDegerler = {
  urunler: Record<string, DuzOrtak>;
  birimler: Record<string, DuzBirim>;
  kodlar?: Record<string, string>;
  anahtarlar?: Record<string, string>;
};
// Veritabanının JSON'u sıfır karakteri kabul etmez: seçenek anahtarı kodlanarak yazılır.
export const birimAnahtari = (urun: string, secenekler: string): string =>
  `${urun} ${encodeURIComponent(secenekler)}`;

// Ürün kodu (adres adı) ve seçeneklerin düz anahtarı: "Renk: Beyaz; Beden: L" yazılışı ve harf ayrımı satırı
// ayırmaz.
export const secenekAnahtari = (secenekler: readonly { ad: string; deger: string }[]): string =>
  secenekler
    .map(({ ad, deger }) => `${ad.toLocaleLowerCase("tr")}\u0000${deger.toLocaleLowerCase("tr")}`)
    .join("\u0001");

// Hücrenin metni: kırpılmış ve NFC. Satır sonları boşluk olur (Excel'de Alt+Enter).
export const hucreMetni = (deger: string): string =>
  deger.replace(/\s+/g, " ").trim().normalize("NFC");

// Bir listenin düz yazılışı: öğeler kırpılır, boşlar atılır, harf sırasıyla dizilir (sıra fark etmez).
export const listeYazisi = (ogeler: readonly string[], dil: string): string =>
  [...new Set(ogeler.map(hucreMetni).filter((oge) => oge !== ""))]
    .sort((a, b) => a.localeCompare(b, dil))
    .join(`${listeAyraci} `);

export const listeyiAyir = (yazi: string): string[] =>
  yazi
    .split(listeAyraci)
    .map(hucreMetni)
    .filter((oge) => oge !== "");

// "Ad: değer" öğesini ayırır; ayraç yoksa undefined.
export const adDegerAyir = (oge: string): { ad: string; deger: string } | undefined => {
  const yer = oge.indexOf(adDegerAyraci);
  if (yer <= 0) return undefined;
  const ad = hucreMetni(oge.slice(0, yer));
  const deger = hucreMetni(oge.slice(yer + 1));
  return ad === "" || deger === "" ? undefined : { ad, deger };
};
