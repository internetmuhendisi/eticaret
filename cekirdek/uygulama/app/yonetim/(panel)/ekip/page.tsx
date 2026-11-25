// Ekip: panel kullanıcıları ve bekleyen davetler (kartlar 0274, 0275; kararlar 0178, 0179). Önce sayfanın izni
// denetlenir, sonra ekip okunur. "Davet et" ve "Daveti geri al" yalnız ekip.davet-et izni olana görünür.
import type { Metadata } from "next";
import { baslangicRolleri } from "../../../../../moduller/ekip/baslangic-rolleri";
import { DavetEt } from "../../../../../yonetim-paneli/ekip/davet";
import { EkipListesi } from "../../../../../yonetim-paneli/ekip/liste";
import { EkipSekmeleri } from "../../../../../yonetim-paneli/ekip/sekmeler";
import {
  bekleyenDavetVerisi,
  davetRolleriVerisi,
  ekipListesiVerisi,
} from "../../../../../yonetim-paneli/ekip/veri";
import { panelOturumu } from "../../../../../yonetim-paneli/panel-oturumu";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../yonetim-paneli/panel-sayfasi";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("ekip");

export default async function EkipSayfasi() {
  await panelSayfasiniAc("ekip");
  const { kimlik, yetkili } = await panelOturumu();
  const davetEder = yetkili("ekip.davet-et");
  const [satirlar, davetler, davetRolleri] = await Promise.all([
    ekipListesiVerisi(kimlik),
    bekleyenDavetVerisi(),
    davetEder ? davetRolleriVerisi() : Promise.resolve([]),
  ]);
  return (
    <PanelSayfasi
      kod="ekip"
      {...(davetEder ? { eylemler: <DavetEt roller={davetRolleri} /> } : {})}
    >
      <div className="flex min-w-0 flex-col gap-4">
        <EkipSekmeleri
          secili="kullanicilar"
          kullaniciSayisi={satirlar.length}
          rolSayisi={Object.keys(baslangicRolleri).length}
        />
        <EkipListesi satirlar={satirlar} davetler={davetler} davetGeriAlinir={davetEder} />
      </div>
    </PanelSayfasi>
  );
}
