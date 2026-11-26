// Kuponlar (kart 0313, karar 0188): kuponların listesi. Önce sayfanın izni denetlenir, sonra listenin durumu adresten
// tanımla okunur ve liste servisle okunur. Okunamazsa liste hata hâlini gösterir.
import type { Metadata } from "next";
import { hatayiKaydet } from "../../../../../izleme/hata-katmani";
import { yeniKuponAdresi } from "../../../../../yonetim-paneli/adresler";
import { EylemBaglantisi } from "../../../../../yonetim-paneli/eylem-dugmesi";
import { KuponListesi } from "../../../../../yonetim-paneli/kuponlar/liste";
import { kuponListesiTanimi } from "../../../../../yonetim-paneli/kuponlar/liste-tanimi";
import { kuponListesiVerisi } from "../../../../../yonetim-paneli/kuponlar/veri";
import { listeDurumunuOku } from "../../../../../yonetim-paneli/liste/tanim";
import { panelOturumu } from "../../../../../yonetim-paneli/panel-oturumu";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../yonetim-paneli/panel-sayfasi";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("kuponlar");

export default async function KuponlarSayfasi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await panelSayfasiniAc("kuponlar");
  const durum = listeDurumunuOku(kuponListesiTanimi, await searchParams);
  const { yetkili } = await panelOturumu();
  const veri = await kuponListesiVerisi(durum).catch((hata: unknown) => {
    hatayiKaydet(hata, { ekran: "kuponlar" });
    return null;
  });
  return (
    <PanelSayfasi
      kod="kuponlar"
      eylemler={
        yetkili("kupon.degistir") ? (
          <EylemBaglantisi eylem="kupon-ekle" asil href={yeniKuponAdresi} />
        ) : undefined
      }
    >
      <KuponListesi durum={durum} veri={veri} ekleyebilir={yetkili("kupon.degistir")} />
    </PanelSayfasi>
  );
}
