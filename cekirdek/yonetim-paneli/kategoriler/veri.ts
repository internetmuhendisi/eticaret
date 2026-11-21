// Kategoriler ekranının verisi (kart 0261), sunucuda: kategori ağacı (kardeş sırasıyla), her kategoriye doğrudan
// bağlı ürünlerin sayısı ve seçilebilir görseller. Kategori yalnız kategori servisiyle okunur; değişiklikler
// kapıdaki kategori uçlarından gider.
import { type GorselSecenegi, gorselSecenekleri } from "../../moduller/duzen/secenekler";
import { kategorilerinUrunSayilari, kategorileriOku } from "../../moduller/kategori/servis";
import { siteninVeritabani } from "../../veritabani/baglanti";

export type KategoriDali = {
  kimlik: string;
  ad: string;
  adresAdi: string;
  aciklama?: string;
  // Boşsa (null) en üsttedir.
  ust: string | null;
  gorsel?: string;
  // Kategoriye doğrudan bağlı, silinmemiş ürünler: silmede bağlantısı kalkacak olanlar.
  urun: number;
  altlar: KategoriDali[];
};

export type KategorilerEkraniVerisi = {
  agac: KategoriDali[];
  gorseller: GorselSecenegi[];
};

export const kategorilerEkraniVerisi = async (): Promise<KategorilerEkraniVerisi> => {
  const vt = siteninVeritabani();
  const [kategoriler, sayilar, gorseller] = await Promise.all([
    kategorileriOku(vt),
    kategorilerinUrunSayilari(vt),
    gorselSecenekleri(vt),
  ]);
  // Liste kardeş sırasıyla gelir; ağaç bu sırayı korur. Üstü listede olmayan kategori en üstte sayılır
  // (kategoriYollari ile aynı).
  const kimlikler = new Set(kategoriler.map((kategori) => kategori.kimlik));
  const altlari = new Map<string | null, KategoriDali[]>();
  const dallar = kategoriler.map((kategori): KategoriDali => {
    const ust = kategori.ust !== null && kimlikler.has(kategori.ust) ? kategori.ust : null;
    const dal: KategoriDali = {
      kimlik: kategori.kimlik,
      ad: kategori.ad,
      adresAdi: kategori.adresAdi,
      ...(kategori.aciklama === undefined ? {} : { aciklama: kategori.aciklama }),
      ust,
      ...(kategori.gorsel === undefined ? {} : { gorsel: kategori.gorsel }),
      urun: sayilar.get(kategori.kimlik) ?? 0,
      altlar: [],
    };
    altlari.set(ust, [...(altlari.get(ust) ?? []), dal]);
    return dal;
  });
  for (const dal of dallar) dal.altlar = altlari.get(dal.kimlik) ?? [];
  return { agac: altlari.get(null) ?? [], gorseller };
};
