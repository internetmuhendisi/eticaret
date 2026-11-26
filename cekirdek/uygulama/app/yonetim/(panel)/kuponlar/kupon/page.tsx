// Kuponun sayfası (kart 0313, karar 0188): özet ve kullanıldığı siparişler. Önce sayfanın izni denetlenir, sonra
// kimlik adresin sorgusundan okunur; kimlik yoksa, kalıba uymuyorsa ya da kupon yoksa bulunamadı. Kullanımların
// sayfası adreste (?sayfa=). Başlık kuponun kodu, altında indirim, koşullar ve geçerlilik. "Düzenle", "Kapat" ve
// "Aç" yalnız kupon.degistir izni olana.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { kimlikMi } from "../../../../../../veritabani/kimlik";
import { kuponDuzenleAdresi } from "../../../../../../yonetim-paneli/adresler";
import { EylemBaglantisi } from "../../../../../../yonetim-paneli/eylem-dugmesi";
import { KuponDurumDugmesi } from "../../../../../../yonetim-paneli/kuponlar/kupon-durumu";
import { KuponSayfasi } from "../../../../../../yonetim-paneli/kuponlar/kupon-sayfasi";
import { kuponSayfasiVerisi } from "../../../../../../yonetim-paneli/kuponlar/veri";
import { panelOturumu } from "../../../../../../yonetim-paneli/panel-oturumu";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../../yonetim-paneli/panel-sayfasi";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("kupon");

export default async function KuponSayfasiSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ kimlik?: string | string[]; sayfa?: string | string[] }>;
}) {
  await panelSayfasiniAc("kupon");
  const { kimlik, sayfa } = await searchParams;
  if (typeof kimlik !== "string" || !kimlikMi(kimlik)) notFound();
  const sayfaNo = typeof sayfa === "string" && /^\d{1,6}$/.test(sayfa) ? Number(sayfa) : 1;
  const [veri, { yetkili }] = await Promise.all([
    kuponSayfasiVerisi(kimlik, sayfaNo),
    panelOturumu(),
  ]);
  if (veri === undefined) notFound();
  return (
    <PanelSayfasi
      kod="kupon"
      baslik={veri.satir.kod}
      altBaslik={veri.aciklama}
      eylemler={
        yetkili("kupon.degistir") ? (
          <>
            <KuponDurumDugmesi kimlik={veri.kimlik} gorulen={veri.gorulen} acik={veri.acik} />
            <EylemBaglantisi eylem="kupon-duzenle" asil href={kuponDuzenleAdresi(veri.kimlik)} />
          </>
        ) : undefined
      }
    >
      <KuponSayfasi veri={veri} />
    </PanelSayfasi>
  );
}
