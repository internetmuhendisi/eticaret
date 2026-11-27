// Siparişler ekranı (kart 0234; kart 0258'de liste motoruna taşındı). Önce sayfanın izni denetlenir (izni olmayana
// bulunamadı), sonra listenin durumu adresten tanımla okunur (tanınmayan değer yok sayılır, sayfa sınırlara çekilir)
// ve liste servisle okunur. Okunamazsa liste hata hâlini gösterir; hata kaydedilir.
import type { Metadata } from "next";
import { hatayiKaydet } from "../../../../../izleme/hata-katmani";
import { panelAdresi } from "../../../../../yonetim-paneli/adresler";
import { EylemBaglantisi } from "../../../../../yonetim-paneli/eylem-dugmesi";
import { listeAdresi, listeDurumunuOku } from "../../../../../yonetim-paneli/liste/tanim";
import { panelOturumu } from "../../../../../yonetim-paneli/panel-oturumu";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../yonetim-paneli/panel-sayfasi";
import {
  DisaAktarDugmesi,
  DisaAktarmaKutusu,
} from "../../../../../yonetim-paneli/siparisler/disa-aktarma";
import { SiparisListesi } from "../../../../../yonetim-paneli/siparisler/liste";
import { siparisListesiTanimi } from "../../../../../yonetim-paneli/siparisler/liste-tanimi";
import {
  disaAktarmaKutusuVerisi,
  disaAktarmaSayilari,
  siparisListesiSecenekleri,
  siparisListesiVerisi,
} from "../../../../../yonetim-paneli/siparisler/veri";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("siparisler");

export default async function SiparislerSayfasi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await panelSayfasiniAc("siparisler");
  const durum = listeDurumunuOku(siparisListesiTanimi, await searchParams);
  const veri = await siparisListesiVerisi(durum).catch((hata: unknown) => {
    hatayiKaydet(hata, { ekran: "siparisler" });
    return null;
  });
  // Süzgeçlerin sunucudan gelen seçenekleri (kart 0267); okunamazsa liste yine açılır, süzgeç seçeneksiz kalır.
  const secenekler = await siparisListesiSecenekleri(durum).catch((hata: unknown) => {
    hatayiKaydet(hata, { ekran: "siparisler" });
    return { kayitSecenekleri: {}, gunYazilari: {} };
  });
  const { kimlik, yetkili } = await panelOturumu();
  // Dışa aktarmanın kutusu okunamazsa liste yine açılır (hata kaydedilir).
  const disaAktarmaKutusu = await disaAktarmaKutusuVerisi(kimlik).catch((hata: unknown) => {
    hatayiKaydet(hata, { ekran: "siparisler" });
    return null;
  });
  return (
    <PanelSayfasi
      kod="siparisler"
      eylemler={
        <>
          {/* Dışa aktar (kart 0316): listenin süzgeçleriyle; sayfanın izni (siparis.gor) yeter. */}
          <DisaAktarDugmesi
            sorgu={listeAdresi(siparisListesiTanimi, durum).split("?")[1] ?? ""}
            {...disaAktarmaSayilari(veri?.toplam ?? null)}
          />
          {/* Elle sipariş (kart 0236): yalnız izni olana; sayfanın asıl eylemi. */}
          {yetkili("siparis.yonet") ? (
            <EylemBaglantisi eylem="elle-siparis" asil href={`${panelAdresi}/siparisler/elle`} />
          ) : null}
        </>
      }
    >
      <DisaAktarmaKutusu veri={disaAktarmaKutusu} />
      <SiparisListesi
        durum={durum}
        veri={veri}
        kayitSecenekleri={secenekler.kayitSecenekleri}
        gunYazilari={secenekler.gunYazilari}
        topluIslemler={siparisListesiTanimi.topluIslemler
          .filter((islem) => yetkili(islem.izin))
          .map((islem) => islem.kod)}
      />
    </PanelSayfasi>
  );
}
