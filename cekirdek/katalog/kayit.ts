// Bileşen kataloğunun parça listesi (kart 0104, karar 0078). Ortak kütüphanedeki her parça dosyası
// burada bir kez yazılır; canlı örneği ornekler/ altındaki aynı adlı dosyadadır. Kütüphanede olup
// burada olmayan dosya ya da örneklerde kullanılmayan parça testte kırmızıdır (testler/kapsam.test.ts).
import type { MetinAnahtari } from "../metinler/metin";

type KatalogParcasi = {
  // Adresteki ad: /gelistirme/bilesenler/<kod>. Kütüphanedeki dosyanın adıyla aynıdır.
  kod: string;
  // Kütüphanedeki dosya, projenin köküne göre.
  dosya: string;
  baslik: MetinAnahtari;
};

const parca = <K extends string>(
  klasor: string,
  kod: K,
  baslik: string,
): KatalogParcasi & { kod: K } => ({
  kod,
  dosya: `bilesenler/${klasor}/${kod}.tsx`,
  baslik: `gelistirme.katalog.parca.${baslik}` as MetinAnahtari,
});

// Sıra katalogdaki sıradır.
export const katalogParcalari = [
  parca("parcalar", "dugme", "dugme"),
  parca("parcalar", "baglanti", "baglanti"),
  parca("parcalar", "etiket", "etiket"),
  parca("parcalar", "giris-alani", "girisAlani"),
  parca("parcalar", "uzun-metin-alani", "uzunMetinAlani"),
  parca("form", "form-alani", "formAlani"),
  parca("parcalar", "secim-kutusu", "secimKutusu"),
  parca("parcalar", "onay-kutusu", "onayKutusu"),
  parca("parcalar", "secenek-grubu", "secenekGrubu"),
  parca("parcalar", "anahtar", "anahtar"),
  parca("parcalar", "siralanabilir-liste", "siralanabilirListe"),
  parca("form", "form", "form"),
  parca("parcalar", "acilir-menu", "acilirMenu"),
  parca("parcalar", "pencere", "pencere"),
  parca("parcalar", "onay-penceresi", "onayPenceresi"),
  parca("parcalar", "adet-secici", "adetSecici"),
  parca("parcalar", "yan-pencere", "yanPencere"),
  parca("parcalar", "sekmeler", "sekmeler"),
  parca("parcalar", "kart", "kart"),
  parca("parcalar", "rozet", "rozet"),
  parca("parcalar", "uyari", "uyari"),
  parca("parcalar", "bildirim", "bildirim"),
  parca("parcalar", "ipucu", "ipucu"),
  parca("parcalar", "iskelet", "iskelet"),
  parca("parcalar", "yukleniyor", "yukleniyor"),
  parca("parcalar", "serit", "serit"),
  parca("parcalar", "akordeon", "akordeon"),
  parca("parcalar", "sayfa-yolu", "sayfaYolu"),
  parca("parcalar", "sayfa-basligi", "sayfaBasligi"),
  parca("parcalar", "bos-hal", "bosHal"),
  parca("parcalar", "sayfalama", "sayfalama"),
  parca("ikonlar", "ikon", "ikon"),
] as const satisfies readonly KatalogParcasi[];

export const katalogParcasi = (kod: string): (typeof katalogParcalari)[number] | undefined =>
  katalogParcalari.find((p) => p.kod === kod);

// Katalogun adresi ve görünüm seçenekleri. Seçim adreste durur: önizleme çerçevesi aynı sayfayı aynı
// seçimle açar.
export const katalogAdresi = "/gelistirme/bilesenler";

export const renkSecenekleri = {
  cihaz: "gelistirme.katalog.renkCihaz",
  acik: "gelistirme.katalog.renkAcik",
  koyu: "gelistirme.katalog.renkKoyu",
} as const satisfies Record<string, MetinAnahtari>;
export type RenkSecenegi = keyof typeof renkSecenekleri;

// Genişlikler tarayıcı testlerinin ölçtüğü üç genişliktir (telefon, tablet, masaüstü).
export const genislikSecenekleri = {
  tam: { baslik: "gelistirme.katalog.genislikTam", piksel: undefined },
  telefon: { baslik: "gelistirme.katalog.genislikTelefon", piksel: 375 },
  tablet: { baslik: "gelistirme.katalog.genislikTablet", piksel: 768 },
  masaustu: { baslik: "gelistirme.katalog.genislikMasaustu", piksel: 1280 },
} as const satisfies Record<string, { baslik: MetinAnahtari; piksel: number | undefined }>;
export type GenislikSecenegi = keyof typeof genislikSecenekleri;

export type KatalogSecimi = { renk: RenkSecenegi; genislik: GenislikSecenegi; cerceve: boolean };

const ilk = (deger: string | string[] | undefined) => (Array.isArray(deger) ? deger[0] : deger);

// Adresteki seçim; tanınmayan değer yok sayılır.
export const katalogSecimi = (
  parametreler: Partial<Record<"renk" | "genislik" | "cerceve", string | string[] | undefined>>,
): KatalogSecimi => {
  const renk = ilk(parametreler.renk) ?? "";
  const genislik = ilk(parametreler.genislik) ?? "";
  return {
    renk: Object.hasOwn(renkSecenekleri, renk) ? (renk as RenkSecenegi) : "cihaz",
    genislik: Object.hasOwn(genislikSecenekleri, genislik) ? (genislik as GenislikSecenegi) : "tam",
    cerceve: ilk(parametreler.cerceve) === "1",
  };
};

export const secimAdresi = (yol: string, secim: KatalogSecimi): string => {
  const parametreler = new URLSearchParams();
  if (secim.renk !== "cihaz") parametreler.set("renk", secim.renk);
  if (secim.genislik !== "tam") parametreler.set("genislik", secim.genislik);
  if (secim.cerceve) parametreler.set("cerceve", "1");
  const sorgu = parametreler.toString();
  return sorgu === "" ? yol : `${yol}?${sorgu}`;
};
