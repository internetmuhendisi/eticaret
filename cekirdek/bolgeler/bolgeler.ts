// Ülke, il ve ilçe listesi (kart 0070, karar 0056). Mağaza adresi, vergi bölgesi ve teslimat adresi
// bölgeleri buradan okur; kayıtlar adı değil kodu tutar. Liste çekirdekle gelen veri dosyalarındadır
// (ulkeler.json, ülke başına <ülke kodu>.json); kodda ülke ya da il adı yazmaz. Ülke adı sitenin
// dilinde biçimleyiciden gelir (cekirdek/metinler/bicimleyici.ts).
//
// Liste resmî değildir: kaynaklar ve yöntem README.md'de, resmî listeyle karşılaştırma kart 0089'da.
import trVerisi from "./tr.json" with { type: "json" };
import ulkeVerisi from "./ulkeler.json" with { type: "json" };

export type Ilce = { kod: string; ad: string };
export type Il = { kod: string; ad: string; ilceler: readonly Ilce[] };
type UlkeBolgeleri = { ulke: string; postaKoduBicimi?: string; iller: readonly Il[] };

// Dışarı verilen listeler dondurulur: çağıran değiştiremez.
const dondur = <T>(liste: readonly T[]): readonly T[] => Object.freeze([...liste]);
const ulkeListesi = dondur(ulkeVerisi.ulkeler);
const ulkeKumesi = new Set<string>(ulkeListesi);

// İl ve ilçe listesi olan ülkeler. Yeni ülkenin dosyası buraya eklenir.
const bolgeliUlkeler: readonly UlkeBolgeleri[] = [trVerisi].map((veri) => ({
  ...veri,
  iller: dondur(
    veri.iller.map((il) =>
      Object.freeze({
        ...il,
        ilceler: dondur(il.ilceler.map((ilce): Ilce => Object.freeze({ ...ilce }))),
      }),
    ),
  ),
}));
const ulkeninBolgeleri = new Map(bolgeliUlkeler.map((veri) => [veri.ulke, veri]));
const iller = new Map(
  bolgeliUlkeler.flatMap((veri) => veri.iller.map((il) => [il.kod, { ...il, ulke: veri.ulke }])),
);
const ilceninIli = new Map(
  bolgeliUlkeler.flatMap((veri) =>
    veri.iller.flatMap((il) => il.ilceler.map((ilce) => [ilce.kod, il.kod])),
  ),
);
const postaKoduBicimleri = new Map(
  bolgeliUlkeler.flatMap((veri) =>
    veri.postaKoduBicimi === undefined ? [] : [[veri.ulke, new RegExp(veri.postaKoduBicimi)]],
  ),
);

// ISO 3166-1 iki harfli ülke kodları, harf sırasıyla.
export const ulkeKodlari = (): readonly string[] => ulkeListesi;

export const ulkeGecerliMi = (kod: string): boolean => ulkeKumesi.has(kod);

// Ülkenin il listesi; listesi olmayan ülke için boştur. İl ve ilçe seçimi yalnız listesi olan
// ülkede istenir.
export const ulkeninIlleri = (ulke: string): readonly Il[] =>
  ulkeninBolgeleri.get(ulke)?.iller ?? [];

export const ilListesiVarMi = (ulke: string): boolean => ulkeninBolgeleri.has(ulke);

export const ilinIlceleri = (ilKodu: string): readonly Ilce[] => iller.get(ilKodu)?.ilceler ?? [];

export const ilAdi = (ilKodu: string): string | undefined => iller.get(ilKodu)?.ad;

export const ilceAdi = (ilceKodu: string): string | undefined => {
  const il = iller.get(ilceninIli.get(ilceKodu) ?? "");
  return il?.ilceler.find((ilce) => ilce.kod === ilceKodu)?.ad;
};

// Bölge doğrulamasının sonuçları (kayıt dosyası gibi: bu adlar değişmez, ekran metni bunlardan çözer).
export const bolgeHatalari = [
  "ulke-yok",
  "il-yok",
  "il-baska-ulkenin",
  "ilce-yok",
  "ilce-baska-ilin",
  "ilce-ilsiz",
] as const;
export type BolgeHatasi = (typeof bolgeHatalari)[number];

// Bir adresin bölgesini denetleyen tek işlev. İl ve ilçe isteğe bağlıdır: hangisinin zorunlu olduğu
// adresi isteyen yerin kuralıdır (ilListesiVarMi). Verilen her kod geçerli ve birbiriyle tutarlı olmalı.
export const bolgeyiDogrula = (bolge: {
  ulke: string;
  il?: string;
  ilce?: string;
}): { gecerli: true } | { gecerli: false; hata: BolgeHatasi } => {
  const hata = (kod: BolgeHatasi) => ({ gecerli: false, hata: kod }) as const;
  if (!ulkeGecerliMi(bolge.ulke)) return hata("ulke-yok");
  if (bolge.il !== undefined) {
    const il = iller.get(bolge.il);
    if (il === undefined) return hata("il-yok");
    if (il.ulke !== bolge.ulke) return hata("il-baska-ulkenin");
  }
  if (bolge.ilce !== undefined) {
    if (bolge.il === undefined) return hata("ilce-ilsiz");
    const ilinKodu = ilceninIli.get(bolge.ilce);
    if (ilinKodu === undefined) return hata("ilce-yok");
    if (ilinKodu !== bolge.il) return hata("ilce-baska-ilin");
  }
  return { gecerli: true };
};

// Posta kodu yalnız biçimle denetlenir, liste tutulmaz. Biçimi bilinmeyen ülkede boş olmayan her
// değer geçer.
export const postaKoduGecerliMi = (ulke: string, postaKodu: string): boolean => {
  const bicim = postaKoduBicimleri.get(ulke);
  return bicim === undefined ? postaKodu.trim().length > 0 : bicim.test(postaKodu);
};
