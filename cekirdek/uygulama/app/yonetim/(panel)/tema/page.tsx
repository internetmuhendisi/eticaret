// Tema ekranı (kart 0148). Önce sayfanın izni denetlenir (izni olmayana bulunamadı), sonra tema okunur; değişiklikler
// tarayıcıdan tema uçlarına gider.
import type { Metadata } from "next";
import { panelOturumu } from "../../../../../yonetim-paneli/panel-oturumu";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../yonetim-paneli/panel-sayfasi";
import {
  TemaEylemleri,
  TemaIcerigi,
  TemaSaglayici,
} from "../../../../../yonetim-paneli/tema/ekran";
import { temaEkraniVerisi } from "../../../../../yonetim-paneli/tema/veri";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("tema");

export default async function TemaSayfasi() {
  await panelSayfasiniAc("tema");
  const { yetkili } = await panelOturumu();
  const izinli = yetkili("tema.degistir");
  const veri = await temaEkraniVerisi();
  return (
    <TemaSaglayici veri={veri} izinli={izinli}>
      <PanelSayfasi kod="tema" eylemler={<TemaEylemleri />}>
        <TemaIcerigi />
      </PanelSayfasi>
    </TemaSaglayici>
  );
}
