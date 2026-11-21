// Ürünler ekranı (kart 0262). Önce sayfanın izni denetlenir (izni olmayana bulunamadı), sonra listenin durumu adresten
// tanımla okunur (tanınmayan değer yok sayılır, sayfa sınırlara çekilir) ve liste servisle okunur. Okunamazsa liste
// hata hâlini gösterir; hata kaydedilir.
import type { Metadata } from "next";
import { hatayiKaydet } from "../../../../../izleme/hata-katmani";
import { listeDurumunuOku } from "../../../../../yonetim-paneli/liste/tanim";
import { panelOturumu } from "../../../../../yonetim-paneli/panel-oturumu";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../yonetim-paneli/panel-sayfasi";
import { UrunListesi } from "../../../../../yonetim-paneli/urunler/liste";
import { urunListesiTanimi } from "../../../../../yonetim-paneli/urunler/liste-tanimi";
import {
  urunListesiVerisi,
  urunSuzgecSecenekleri,
} from "../../../../../yonetim-paneli/urunler/veri";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("urunler");

export default async function UrunlerSayfasi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await panelSayfasiniAc("urunler");
  const durum = listeDurumunuOku(urunListesiTanimi, await searchParams);
  const { yetkili } = await panelOturumu();
  const [veri, secenekler] = await Promise.all([
    urunListesiVerisi(durum, { gorselGorur: yetkili("dosya.gor") }).catch((hata: unknown) => {
      hatayiKaydet(hata, { ekran: "urunler" });
      return null;
    }),
    urunSuzgecSecenekleri(),
  ]);
  return (
    <PanelSayfasi kod="urunler">
      <UrunListesi
        durum={durum}
        veri={veri}
        kayitSecenekleri={secenekler}
        topluIslemler={urunListesiTanimi.topluIslemler
          .filter((islem) => yetkili(islem.izin))
          .map((islem) => islem.kod)}
      />
    </PanelSayfasi>
  );
}
