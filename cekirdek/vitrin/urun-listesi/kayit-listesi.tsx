// Kategori, marka ve etiket sayfası (kart 0136; iskelet kart 0135, karar 0103): kayıt sayfasının iskeleti ve
// içinde filtreli ürün listesi. Adres dosyaları (app/(vitrin)/<tür>/[adresAdi]/page.tsx) yalnız bunu çağırır.
//
// - Kategori sayfası alt kategorilerin ürünlerini de gösterir; marka ve etiket sayfası grubun ürünlerini.
// - Marka sayfasında marka filtresi yoktur.
// - Filtre ya da sıralama varsa sayfa arama motorlarının dizinine girmez; yalnız sayfa numarası serbesttir.
import type { Metadata } from "next";
import { etiketServisi } from "../../moduller/etiket/servis";
import { kategoriUrunKosulu } from "../../moduller/kategori/servis";
import { markaServisi } from "../../moduller/marka/servis";
import { kayitAdresleri } from "../adresler";
import {
  type AdresParametreleri as KayitAdresi,
  KayitSayfasi,
  kayitSayfasininBilgisi,
  type SorguParametreleri,
  sayfaninKaydi,
} from "../kayit-sayfasi";
import { adrestenDurum, filtreliMi } from "./adres";
import { UrunListesiGorunumu, urunListesiVerisi, urunSayisiYazisi } from "./sayfa";

export type ListeliKayitTuru = "kategori" | "marka" | "etiket";

const kapsam = (tur: ListeliKayitTuru, kimlik: string) => {
  switch (tur) {
    case "kategori":
      return kategoriUrunKosulu(kimlik, true);
    case "marka":
      return markaServisi.urunKosulu(kimlik);
    case "etiket":
      return etiketServisi.urunKosulu(kimlik);
  }
};

export const kayitListesiBilgisi = async (
  tur: ListeliKayitTuru,
  parametreler: KayitAdresi,
  sorgu: SorguParametreleri,
): Promise<Metadata> => {
  const bilgi = await kayitSayfasininBilgisi(tur, parametreler, sorgu);
  return filtreliMi(adrestenDurum(await sorgu))
    ? { ...bilgi, robots: { index: false, follow: true } }
    : bilgi;
};

export async function KayitListesiSayfasi({
  tur,
  parametreler,
  sorgu,
}: {
  tur: ListeliKayitTuru;
  parametreler: KayitAdresi;
  sorgu: SorguParametreleri;
}) {
  const kayit = await sayfaninKaydi(tur, parametreler, sorgu);
  const veri = await urunListesiVerisi({
    kapsam: kapsam(tur, kayit.kimlik),
    parametreler: await sorgu,
    markaGrubu: tur !== "marka",
  });
  return (
    <KayitSayfasi tur={tur} kayit={kayit} ek={urunSayisiYazisi(veri)}>
      <UrunListesiGorunumu veri={veri} yol={kayitAdresleri[tur](kayit.adresAdi)} />
    </KayitSayfasi>
  );
}
