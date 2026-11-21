// Özellikler ekranının verisi (kart 0261), sunucuda: silinmemiş özellikler sırasıyla ve seçenekleriyle, her birinin
// kullanımı (değeri olan ürün sayısı, türünün değişip değişemeyeceği). Özellik yalnız özellik servisiyle okunur;
// değişiklikler kapıdaki özellik uçlarından gider.
import type { OzellikTuru } from "../../kayitlar/ozellik";
import { ozellikServisi } from "../../moduller/ozellik/servis";
import { siteninVeritabani } from "../../veritabani/baglanti";

export type OzellikSatiri = {
  kimlik: string;
  ad: string;
  tur: OzellikTuru;
  birim?: string;
  filtrede: boolean;
  // Değeri olan silinmemiş ürünler: silmede değeri bunlardan kalkar.
  urun: number;
  // Ürünlerde değeri var: tür değişmez (servisin kuralı).
  degeriVar: boolean;
  // Liste türünde seçenekler, sırasıyla; her birinin değeri olan ürün sayısıyla.
  secenekler: { kimlik: string; ad: string; urun: number }[];
};

export const ozelliklerEkraniVerisi = async (): Promise<OzellikSatiri[]> => {
  const vt = siteninVeritabani();
  const [ozellikler, kullanimlar] = await Promise.all([
    ozellikServisi.hepsiniOku(vt),
    ozellikServisi.kullanimlar(vt),
  ]);
  return ozellikler.map((ozellik) => {
    const kullanim = kullanimlar.get(ozellik.kimlik);
    return {
      kimlik: ozellik.kimlik,
      ad: ozellik.ad,
      tur: ozellik.tur,
      ...(ozellik.birim === undefined ? {} : { birim: ozellik.birim }),
      filtrede: ozellik.filtrede,
      urun: kullanim?.urun ?? 0,
      degeriVar: kullanim?.degeriVar ?? false,
      secenekler: ozellik.secenekler.map((secenek) => ({
        kimlik: secenek.kimlik,
        ad: secenek.ad,
        urun: kullanim?.secenekler.get(secenek.kimlik) ?? 0,
      })),
    };
  });
};
