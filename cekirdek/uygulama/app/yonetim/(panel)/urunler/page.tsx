// Ürünler ekranı (kart 0262). Önce sayfanın izni denetlenir (izni olmayana bulunamadı), sonra listenin durumu adresten
// tanımla okunur (tanınmayan değer yok sayılır, sayfa sınırlara çekilir) ve liste servisle okunur. Okunamazsa liste
// hata hâlini gösterir; hata kaydedilir.
import type { Metadata } from "next";
import { calisanSite } from "../../../../../ayar-semasi/calisan-site";
import { hatayiKaydet } from "../../../../../izleme/hata-katmani";
import { siteninBicimleyicisi } from "../../../../../metinler/site-metni";
import { yeniUrunAdresi } from "../../../../../yonetim-paneli/adresler";
import { EylemBaglantisi } from "../../../../../yonetim-paneli/eylem-dugmesi";
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
    // Süzgeç seçenekleri okunamazsa süzgeçler boş açılır, liste yine çizilir; hata kaydedilir (bağımsız kontrolün
    // bulgusu: bütün sayfa hata ekranına düşüyordu).
    urunSuzgecSecenekleri().catch((hata: unknown) => {
      hatayiKaydet(hata, { ekran: "urunler", kaynak: "suzgec-secenekleri" });
      return {};
    }),
  ]);
  const { simge, yer } = siteninBicimleyicisi(calisanSite().ayarlar).paraSimgesi();
  return (
    <PanelSayfasi
      kod="urunler"
      eylemler={
        yetkili("urun.degistir") ? (
          <EylemBaglantisi eylem="urun-ekle" asil href={yeniUrunAdresi} />
        ) : undefined
      }
    >
      <UrunListesi
        durum={durum}
        veri={veri}
        kayitSecenekleri={secenekler}
        topluIslemler={urunListesiTanimi.topluIslemler
          .filter((islem) => yetkili(islem.izin))
          .map((islem) => islem.kod)}
        para={{ simge, simgeYeri: yer }}
      />
    </PanelSayfasi>
  );
}
