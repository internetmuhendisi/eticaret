// Stoğa gelince haber ver eklentisinin ürün sayfası yuvası (kart 0144, karar 0117): talep alınabilir birim varsa
// formu çizer. Hangi birimlerin alınabildiği sunucuda servisle bulunur (tek sorgu kümesi); tarayıcı yalnız seçili
// birimin listede olup olmadığına bakar. Eklenti kapalıysa servis boş küme verir, form hiç çizilmez.
import type { Site } from "../../ayar-semasi/site-klasoru";
import type { Veritabani } from "../../veritabani/baglanti";
import { eklentiAcikMi } from "../acik";
import type { UrunSayfasiYuvasi } from "../urun-sayfasi-yuvalari";
import { StokBildirimiFormu } from "./form";
import { stokBildirimiServisi } from "./servis";

// Eklenti açıkken müşteri tükenmiş değeri seçip haber isteyebilir.
export const stokBildirimiTukenmisBirimIster = (site: Site): boolean =>
  eklentiAcikMi(site, "stoga-gelince-haber-ver");

export const stokBildirimiYuvasi: UrunSayfasiYuvasi = async (
  vt: Veritabani,
  site: Site,
  birimler: readonly string[],
) => {
  const servis = stokBildirimiServisi(site);
  const alinabilir = await servis.talepAlinabilirBirimler(vt, [...birimler]);
  if (alinabilir.size === 0) return null;
  return (
    <StokBildirimiFormu
      birimler={[...alinabilir]}
      uyeOlmayan={await servis.uyeOlmayanIzinliMi(vt)}
    />
  );
};
