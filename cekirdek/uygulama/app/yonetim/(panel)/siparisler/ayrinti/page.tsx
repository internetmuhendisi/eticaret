// Sipariş ayrıntısı ekranı (kart 0234). Önce sayfanın izni denetlenir, sonra numara adresin sorgusundan okunur;
// numara yoksa, kalıba uymuyorsa ya da sipariş yoksa bulunamadı. İşlemler yöneticinin izinlerine göre gelir.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { doldur } from "../../../../../../metinler/doldur";
import { metin } from "../../../../../../metinler/site-metni";
import { siparisNumarasiSemasi } from "../../../../../../moduller/siparis/havale-bildirimi-semalari";
import { panelOturumu } from "../../../../../../yonetim-paneli/panel-oturumu";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../../yonetim-paneli/panel-sayfasi";
import {
  AyrintiBasligi,
  SiparisAyrintisi,
} from "../../../../../../yonetim-paneli/siparisler/ayrinti";
import { IadeIslemleri } from "../../../../../../yonetim-paneli/siparisler/iade-penceresi";
import { SiparisIslemleri } from "../../../../../../yonetim-paneli/siparisler/islemler";
import { siparisAyrintisiVerisi } from "../../../../../../yonetim-paneli/siparisler/veri";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("siparis-ayrintisi");

export default async function SiparisAyrintisiSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ numara?: string | string[] }>;
}) {
  await panelSayfasiniAc("siparis-ayrintisi");
  const numara = siparisNumarasiSemasi.safeParse((await searchParams).numara);
  if (!numara.success) notFound();
  const { yetkili } = await panelOturumu();
  const veri = await siparisAyrintisiVerisi(numara.data, yetkili);
  if (veri === null) notFound();
  return (
    <PanelSayfasi
      kod="siparis-ayrintisi"
      baslik={doldur(metin("yonetim.siparis.baslik"), { numara: veri.numara })}
      eylemler={
        <>
          {veri.iade === null ? null : <IadeIslemleri numara={veri.numara} veri={veri.iade} />}
          <SiparisIslemleri
            numara={veri.numara}
            durum={veri.durum}
            tutar={veri.tutarlar.toplam}
            islemler={veri.islemler}
            kargoFirmalari={veri.kargoFirmalari}
            kargo={
              veri.kargo === null
                ? null
                : { firma: veri.kargo.firma, takipNumarasi: veri.kargo.takipNumarasi }
            }
          />
        </>
      }
    >
      <AyrintiBasligi veri={veri} />
      <SiparisAyrintisi veri={veri} />
    </PanelSayfasi>
  );
}
