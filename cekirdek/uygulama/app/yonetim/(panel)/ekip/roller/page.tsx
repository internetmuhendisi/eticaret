// Ekip, roller sekmesi (kart 0274, karar 0178): rollerin izin tablosu, yalnız okunur.
import type { Metadata } from "next";
import { RollerTablosu } from "../../../../../../yonetim-paneli/ekip/roller";
import { EkipSekmeleri } from "../../../../../../yonetim-paneli/ekip/sekmeler";
import { ekipListesiVerisi, izinTablosuVerisi } from "../../../../../../yonetim-paneli/ekip/veri";
import { panelOturumu } from "../../../../../../yonetim-paneli/panel-oturumu";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../../yonetim-paneli/panel-sayfasi";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("ekip-rolleri");

export default async function EkipRolleriSayfasi() {
  await panelSayfasiniAc("ekip-rolleri");
  const { kimlik } = await panelOturumu();
  const [tablo, satirlar] = await Promise.all([izinTablosuVerisi(), ekipListesiVerisi(kimlik)]);
  return (
    <PanelSayfasi kod="ekip-rolleri">
      <div className="flex min-w-0 flex-col gap-4">
        <EkipSekmeleri
          secili="roller"
          kullaniciSayisi={satirlar.length}
          rolSayisi={tablo.roller.length}
        />
        <RollerTablosu tablo={tablo} />
      </div>
    </PanelSayfasi>
  );
}
