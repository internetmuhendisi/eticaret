// Ürünler ekranı (kart 0262). Önce sayfanın izni denetlenir (izni olmayana bulunamadı), sonra listenin durumu adresten
// tanımla okunur (tanınmayan değer yok sayılır, sayfa sınırlara çekilir) ve liste servisle okunur. Okunamazsa liste
// hata hâlini gösterir; hata kaydedilir.
import type { Metadata } from "next";
import { calisanSite } from "../../../../../ayar-semasi/calisan-site";
import { eklentiAcikMi } from "../../../../../eklentiler/acik";
import { hatayiKaydet } from "../../../../../izleme/hata-katmani";
import { siteninBicimleyicisi } from "../../../../../metinler/site-metni";
import { urunlerExcelAdresi, yeniUrunAdresi } from "../../../../../yonetim-paneli/adresler";
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

// Listenin sorgusu (sayfa numarası olmadan): Excel sayfasının "Listedeki süzgeçlerle" seçeneği.
const listeSorgusu = (sorgu: Record<string, string | string[] | undefined>): string => {
  const yazi = new URLSearchParams();
  for (const [ad, deger] of Object.entries(sorgu)) {
    if (ad === "sayfa" || deger === undefined) continue;
    for (const tek of Array.isArray(deger) ? deger : [deger]) yazi.append(ad, tek);
  }
  return yazi.toString();
};

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
        <>
          {/* Excel ile toplu ürün işlemleri eklentisi (kart 0315): listenin süzgeçleri sayfaya taşınır. */}
          {eklentiAcikMi(calisanSite(), "excel-ile-toplu-urun-islemleri") ? (
            <EylemBaglantisi
              eylem="urunler-excel"
              href={urunlerExcelAdresi(listeSorgusu(await searchParams))}
            />
          ) : null}
          {yetkili("urun.degistir") ? (
            <EylemBaglantisi eylem="urun-ekle" asil href={yeniUrunAdresi} />
          ) : null}
        </>
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
        kopyalayabilir={yetkili("urun.degistir")}
        fiyatIzni={yetkili("fiyat.degistir")}
      />
    </PanelSayfasi>
  );
}
