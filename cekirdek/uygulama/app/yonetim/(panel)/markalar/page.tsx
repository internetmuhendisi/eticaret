// Markalar ve etiketler ekranı (kart 0261). Önce sayfanın izni denetlenir (marka.gor; izni olmayana bulunamadı),
// sonra yalnız görme izni olan grubun listesi okunur. Değişiklikler tarayıcıdan marka ve etiket uçlarına gider.
import type { Metadata } from "next";
import { MarkalarIcerigi } from "../../../../../yonetim-paneli/markalar/ekran";
import { markalarEkraniVerisi } from "../../../../../yonetim-paneli/markalar/veri";
import { panelOturumu } from "../../../../../yonetim-paneli/panel-oturumu";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../yonetim-paneli/panel-sayfasi";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("markalar");

export default async function MarkalarSayfasi() {
  await panelSayfasiniAc("markalar");
  const { yetkili } = await panelOturumu();
  const veri = await markalarEkraniVerisi({
    marka: yetkili("marka.gor"),
    etiket: yetkili("etiket.gor"),
  });
  return (
    <PanelSayfasi kod="markalar">
      <MarkalarIcerigi
        veri={veri}
        izinler={{
          marka: { degistir: yetkili("marka.degistir"), sil: yetkili("marka.sil") },
          etiket: { degistir: yetkili("etiket.degistir"), sil: yetkili("etiket.sil") },
        }}
      />
    </PanelSayfasi>
  );
}
