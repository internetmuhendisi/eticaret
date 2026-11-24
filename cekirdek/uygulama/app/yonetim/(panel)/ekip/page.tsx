// Ekip: panel kullanıcıları (kart 0274, karar 0178). Önce sayfanın izni denetlenir, sonra ekip okunur.
import type { Metadata } from "next";
import { baslangicRolleri } from "../../../../../moduller/ekip/baslangic-rolleri";
import { EkipListesi } from "../../../../../yonetim-paneli/ekip/liste";
import { EkipSekmeleri } from "../../../../../yonetim-paneli/ekip/sekmeler";
import { ekipListesiVerisi } from "../../../../../yonetim-paneli/ekip/veri";
import { panelOturumu } from "../../../../../yonetim-paneli/panel-oturumu";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../yonetim-paneli/panel-sayfasi";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("ekip");

export default async function EkipSayfasi() {
  await panelSayfasiniAc("ekip");
  const { kimlik } = await panelOturumu();
  const satirlar = await ekipListesiVerisi(kimlik);
  return (
    <PanelSayfasi kod="ekip">
      <div className="flex min-w-0 flex-col gap-4">
        <EkipSekmeleri
          secili="kullanicilar"
          kullaniciSayisi={satirlar.length}
          rolSayisi={Object.keys(baslangicRolleri).length}
        />
        <EkipListesi satirlar={satirlar} />
      </div>
    </PanelSayfasi>
  );
}
