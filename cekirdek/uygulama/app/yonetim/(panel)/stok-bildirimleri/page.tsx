// Stok bildirimleri ekranı (kart 0144, karar 0117; kart 0258'de liste motoruna taşındı). Önce sayfanın izni ve
// eklentinin açıklığı denetlenir (yoksa bulunamadı), sonra listenin durumu adresten tanımla okunur ve liste servisle
// okunur; tarih ve sayı burada sitenin biçimiyle yazılır. Okunamazsa liste hata hâlini gösterir; hata kaydedilir.
import type { Metadata } from "next";
import { calisanSite } from "../../../../../ayar-semasi/calisan-site";
import { StokBildirimleriListesi } from "../../../../../eklentiler/stoga-gelince-haber-ver/panel/liste";
import { stokBildirimleriListesiTanimi } from "../../../../../eklentiler/stoga-gelince-haber-ver/panel/liste-tanimi";
import { stokBildirimiServisi } from "../../../../../eklentiler/stoga-gelince-haber-ver/servis";
import { hatayiKaydet } from "../../../../../izleme/hata-katmani";
import { stokBildirimiAyari } from "../../../../../kayitlar/eklentiler";
import { bicim } from "../../../../../metinler/site-metni";
import { siteninVeritabani } from "../../../../../veritabani/baglanti";
import { listeDurumunuOku } from "../../../../../yonetim-paneli/liste/tanim";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../yonetim-paneli/panel-sayfasi";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("stok-bildirimleri");

export default async function StokBildirimleriSayfasi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await panelSayfasiniAc("stok-bildirimleri");
  const durum = listeDurumunuOku(stokBildirimleriListesiTanimi, await searchParams);
  const bicimleyici = bicim();
  const satirlar = await stokBildirimiServisi(calisanSite())
    .panelListesi(siteninVeritabani(), {
      siralama: durum.siralama as (typeof stokBildirimleriListesiTanimi.siralamalar)[number],
      ara: durum.ara,
    })
    .catch((hata: unknown) => {
      hatayiKaydet(hata, { ekran: "stok-bildirimleri" });
      return null;
    });
  return (
    <PanelSayfasi kod="stok-bildirimleri">
      <StokBildirimleriListesi
        durum={durum}
        veri={
          satirlar === null
            ? null
            : {
                satirlar: satirlar.map((satir) => ({
                  birim: satir.birim,
                  urunAdi: satir.urunAdi,
                  adres: satir.adres,
                  secim: satir.secim,
                  bekleyen: bicimleyici.sayi(satir.bekleyen),
                  enEski: bicimleyici.tarih(satir.enEski),
                })),
                toplam: satirlar.length,
                sayfa: 1,
                sayfaSayisi: 1,
                sayfaBoyu: stokBildirimiAyari.panelSiniri,
                sekmeSayilari: {},
              }
        }
        sinirda={satirlar !== null && satirlar.length >= stokBildirimiAyari.panelSiniri}
        sinir={bicimleyici.sayi(stokBildirimiAyari.panelSiniri)}
      />
    </PanelSayfasi>
  );
}
