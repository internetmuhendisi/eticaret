// Markalar ve etiketler ekranının verisi (kart 0261), sunucuda: silinmemiş markalar ve etiketler ada göre, her
// birine bağlı silinmemiş ürünlerin sayısıyla, ve seçilebilir görseller (marka logosu). Yalnız görme izni olan
// grubun listesi okunur. Gruplar yalnız grup servisiyle okunur; değişiklikler kapıdaki uçlardan gider.
import { type GorselSecenegi, gorselSecenekleri } from "../../moduller/duzen/secenekler";
import { etiketServisi } from "../../moduller/etiket/servis";
import { markaServisi } from "../../moduller/marka/servis";
import type { Grup } from "../../moduller/urun/grup-servisi";
import { siteninVeritabani } from "../../veritabani/baglanti";

export type GrupSatiri = Omit<Grup, "silindi"> & { urun: number };

export type MarkalarEkraniVerisi = {
  // Görme izni yoksa liste yoktur (undefined).
  markalar: GrupSatiri[] | undefined;
  etiketler: GrupSatiri[] | undefined;
  // Logo için seçilebilir görseller; sitedeki görselleri görme izni (dosya.gor) yoksa yok: logo ne satırda ne
  // formda görünür (bağımsız kontrolün bulgusu).
  gorseller: GorselSecenegi[] | undefined;
};

const satirlar = async (servis: typeof markaServisi): Promise<GrupSatiri[]> => {
  const vt = siteninVeritabani();
  const [gruplar, sayilar] = await Promise.all([servis.hepsiniOku(vt), servis.urunSayilari(vt)]);
  return gruplar.map(({ silindi: _silindi, ...grup }) => ({
    ...grup,
    urun: sayilar.get(grup.kimlik) ?? 0,
  }));
};

export const markalarEkraniVerisi = async (izin: {
  marka: boolean;
  etiket: boolean;
  gorsel: boolean;
}): Promise<MarkalarEkraniVerisi> => {
  const [markalar, etiketler, gorseller] = await Promise.all([
    izin.marka ? satirlar(markaServisi) : undefined,
    izin.etiket ? satirlar(etiketServisi) : undefined,
    izin.marka && izin.gorsel ? gorselSecenekleri(siteninVeritabani()) : undefined,
  ]);
  return { markalar, etiketler, gorseller };
};
