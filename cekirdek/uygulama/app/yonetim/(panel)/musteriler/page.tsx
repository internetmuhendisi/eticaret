// Müşteriler ekranı (kart 0271, karar 0173). Önce sayfanın izni denetlenir (izni olmayana bulunamadı), sonra listenin
// durumu adresten tanımla okunur ve liste servisle okunur. Okunamazsa liste hata hâlini gösterir; hata kaydedilir.
import type { Metadata } from "next";
import { hatayiKaydet } from "../../../../../izleme/hata-katmani";
import { listeDurumunuOku } from "../../../../../yonetim-paneli/liste/tanim";
import { MusteriListesi } from "../../../../../yonetim-paneli/musteriler/liste";
import { musteriListesiTanimi } from "../../../../../yonetim-paneli/musteriler/liste-tanimi";
import {
  musteriListesiGunYazilari,
  musteriListesiVerisi,
} from "../../../../../yonetim-paneli/musteriler/veri";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../yonetim-paneli/panel-sayfasi";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("musteriler");

export default async function MusterilerSayfasi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await panelSayfasiniAc("musteriler");
  const durum = listeDurumunuOku(musteriListesiTanimi, await searchParams);
  const veri = await musteriListesiVerisi(durum).catch((hata: unknown) => {
    hatayiKaydet(hata, { ekran: "musteriler" });
    return null;
  });
  return (
    <PanelSayfasi kod="musteriler">
      <MusteriListesi durum={durum} veri={veri} gunYazilari={musteriListesiGunYazilari(durum)} />
    </PanelSayfasi>
  );
}
