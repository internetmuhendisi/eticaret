// Vitrin listelerinin filtre kuralları (kart 0136, karar 0102): bir ürünün seçili filtrelere uyup uymadığı,
// filtre seçeneklerinin yanındaki sayılar ve fiyat sıralaması. Saf işlevlerdir; veriyi vitrin/urun-listesi/veri.ts okur.
//
// - Bir grubun içindeki seçimler "veya", gruplar arası "ve" ile birleşir (Beden: S veya M, ve Renk: Siyah).
// - Ürün seçenekleri (beden, renk) aynı birimde aranır: "M" ve "Siyah" seçilince M-Siyah birleşimi olan ürün
//   uyar, yalnız M-Beyaz ile S-Siyah'ı olan ürün uymaz. "Stoktakiler" de seçiliyse o birleşim stokta olmalı.
//   Seçenek seçilmemişse "stoktakiler" ürünün herhangi bir biriminin stokta olmasıdır (stok/durum.ts'deki
//   tükenmişlik kuralının tersi).
// - Fiyat kartta görünen en düşük fiyattır (fiyat/gosterim.ts, fiyatAraliklari): vergi gösterimi ve indirim
//   dahil. Fiyatı olmayan ürün fiyat filtresine uymaz, fiyat sıralamasında sondadır.
// - Seçeneğin sayısı, o grupta yalnız o seçenek seçilseydi (öteki grupların seçimleri yerinde) gelecek ürün
//   sayısıdır.
// - Gruplar ve değerler adlarından üretilen okunur anahtarlarla eşleşir (metinler/adres-adi.ts): farklı
//   ürünlerdeki "Beden" seçenekleri tek gruptur, anahtar adreste durur.

// Anahtarla okuma yalnız nesnenin kendi alanından: anahtar addan üretilir, "Constructor" adlı bir özellik
// "constructor" anahtarını verir ve düz nesnenin kalıtılmış alanına (Object işlevi) düşmemelidir.
export const kendiAlani = <T>(
  nesne: Readonly<Record<string, T>>,
  anahtar: string,
): T | undefined => (Object.hasOwn(nesne, anahtar) ? nesne[anahtar] : undefined);

export type FiltreBirimi = {
  stokta: boolean;
  // Seçenek anahtarı → değer anahtarı.
  degerler: Readonly<Record<string, string>>;
};

export type FiltreAdayi = {
  kimlik: string;
  // Markanın adres adı.
  marka?: string;
  stokta: boolean;
  birimler: readonly FiltreBirimi[];
  // Filtrede kullanılan özelliğin anahtarı → değer anahtarı.
  ozellikler: Readonly<Record<string, string>>;
  // Kartta görünen en düşük fiyat, kuruş. Yalnız fiyat filtresi ya da sıralaması varken hesaplanır.
  fiyat?: number;
};

export type UrunFiltresi = {
  fiyat?: { enAz?: number; enCok?: number };
  markalar: readonly string[];
  secenekler: Readonly<Record<string, readonly string[]>>;
  ozellikler: Readonly<Record<string, readonly string[]>>;
  stoktakiler: boolean;
};

export const bosFiltre = (): UrunFiltresi => ({
  markalar: [],
  secenekler: {},
  ozellikler: {},
  stoktakiler: false,
});

// Filtrenin grupları: sayılar bir grubu dışarıda bırakarak hesaplanır.
export type FiltreGrubu =
  | { tur: "fiyat" }
  | { tur: "marka" }
  | { tur: "stok" }
  | { tur: "secenek"; anahtar: string }
  | { tur: "ozellik"; anahtar: string };

const doluSecimler = (secimler: Readonly<Record<string, readonly string[]>>) =>
  Object.entries(secimler).filter(([, degerler]) => degerler.length > 0);

export const fiyatFiltresiVarMi = (filtre: UrunFiltresi): boolean =>
  filtre.fiyat?.enAz !== undefined || filtre.fiyat?.enCok !== undefined;

export const filtreBosMu = (filtre: UrunFiltresi): boolean =>
  !fiyatFiltresiVarMi(filtre) &&
  filtre.markalar.length === 0 &&
  doluSecimler(filtre.secenekler).length === 0 &&
  doluSecimler(filtre.ozellikler).length === 0 &&
  !filtre.stoktakiler;

const ayniGrup = (a: FiltreGrubu | undefined, tur: FiltreGrubu["tur"], anahtar?: string) =>
  a !== undefined && a.tur === tur && ("anahtar" in a ? a.anahtar === anahtar : true);

// Ürün filtreye uyuyor mu? "haric" verilirse o grubun seçimi yok sayılır (sayılar için).
export const filtreyeUyarMi = (
  aday: FiltreAdayi,
  filtre: UrunFiltresi,
  haric?: FiltreGrubu,
): boolean => {
  if (fiyatFiltresiVarMi(filtre) && !ayniGrup(haric, "fiyat")) {
    const { enAz, enCok } = filtre.fiyat ?? {};
    if (aday.fiyat === undefined) return false;
    if (enAz !== undefined && aday.fiyat < enAz) return false;
    if (enCok !== undefined && aday.fiyat > enCok) return false;
  }
  if (filtre.markalar.length > 0 && !ayniGrup(haric, "marka")) {
    if (aday.marka === undefined || !filtre.markalar.includes(aday.marka)) return false;
  }
  for (const [anahtar, degerler] of doluSecimler(filtre.ozellikler)) {
    if (ayniGrup(haric, "ozellik", anahtar)) continue;
    const deger = kendiAlani(aday.ozellikler, anahtar);
    if (deger === undefined || !degerler.includes(deger)) return false;
  }
  const stok = filtre.stoktakiler && !ayniGrup(haric, "stok");
  const secenekler = doluSecimler(filtre.secenekler).filter(
    ([anahtar]) => !ayniGrup(haric, "secenek", anahtar),
  );
  if (secenekler.length === 0) return !stok || aday.stokta;
  return aday.birimler.some(
    (birim) =>
      (!stok || birim.stokta) &&
      secenekler.every(([anahtar, degerler]) => {
        const deger = kendiAlani(birim.degerler, anahtar);
        return deger !== undefined && degerler.includes(deger);
      }),
  );
};

// Grubun yalnız bu seçimle değiştirildiği filtre.
const grubuSec = (filtre: UrunFiltresi, grup: FiltreGrubu, deger: string): UrunFiltresi => {
  switch (grup.tur) {
    case "marka":
      return { ...filtre, markalar: [deger] };
    case "stok":
      return { ...filtre, stoktakiler: true };
    case "secenek":
      return { ...filtre, secenekler: { ...filtre.secenekler, [grup.anahtar]: [deger] } };
    case "ozellik":
      return { ...filtre, ozellikler: { ...filtre.ozellikler, [grup.anahtar]: [deger] } };
    case "fiyat":
      return filtre;
  }
};

// Seçeneğin sayısı: grupta yalnız bu seçenek seçilseydi gelecek ürün sayısı.
export const secenekSayisi = (
  adaylar: readonly FiltreAdayi[],
  filtre: UrunFiltresi,
  grup: FiltreGrubu,
  deger: string,
): number => {
  const secili = grubuSec(filtre, grup, deger);
  return adaylar.filter((aday) => filtreyeUyarMi(aday, secili)).length;
};

// Fiyata göre sıralama: fiyatı olmayan sonda; eşit fiyatta gelen sıra (en yeni önce) korunur.
export const fiyataGoreSirala = (
  adaylar: readonly FiltreAdayi[],
  yon: "artan" | "azalan",
): FiltreAdayi[] =>
  adaylar.toSorted((a, b) => {
    if (a.fiyat === undefined || b.fiyat === undefined) {
      return (a.fiyat === undefined ? 1 : 0) - (b.fiyat === undefined ? 1 : 0);
    }
    return yon === "artan" ? a.fiyat - b.fiyat : b.fiyat - a.fiyat;
  });
