// Yorumlar ekranı (kart 0277, karar 0174). Önce sayfanın izni denetlenir (izni olmayana bulunamadı), sonra listenin
// durumu adresten tanımla okunur (tanınmayan değer yok sayılır, sayfa sınırlara çekilir; sekme yoksa Onay bekleyen)
// ve liste servisle okunur. Okunamazsa liste hata hâlini gösterir; hata kaydedilir.
import type { Metadata } from "next";
import { hatayiKaydet } from "../../../../../izleme/hata-katmani";
import { listeDurumunuOku } from "../../../../../yonetim-paneli/liste/tanim";
import { panelOturumu } from "../../../../../yonetim-paneli/panel-oturumu";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../yonetim-paneli/panel-sayfasi";
import { YorumListesi } from "../../../../../yonetim-paneli/yorumlar/liste";
import { yorumListesiTanimi } from "../../../../../yonetim-paneli/yorumlar/liste-tanimi";
import { yorumListesiVerisi } from "../../../../../yonetim-paneli/yorumlar/veri";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("yorumlar");

export default async function YorumlarSayfasi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await panelSayfasiniAc("yorumlar");
  const durum = listeDurumunuOku(yorumListesiTanimi, await searchParams);
  const { yetkili } = await panelOturumu();
  const veri = await yorumListesiVerisi(durum).catch((hata: unknown) => {
    hatayiKaydet(hata, { ekran: "yorumlar" });
    return null;
  });
  return (
    <PanelSayfasi kod="yorumlar">
      <YorumListesi
        durum={durum}
        veri={veri}
        topluIslemler={yorumListesiTanimi.topluIslemler
          .filter((islem) => yetkili(islem.izin))
          .map((islem) => islem.kod)}
        kararVerir={yetkili("yorum.onayla")}
        urunGorur={yetkili("urun.gor")}
      />
    </PanelSayfasi>
  );
}
