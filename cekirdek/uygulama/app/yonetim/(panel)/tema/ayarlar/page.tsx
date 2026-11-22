// Tema ayarları ekranı (kart 0260). Önce sayfanın izni denetlenir (izni olmayana bulunamadı), sonra tema okunur;
// değişiklikler tarayıcıdan tema ve logo uçlarına gider.
import type { Metadata } from "next";
import { panelOturumu } from "../../../../../../yonetim-paneli/panel-oturumu";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../../yonetim-paneli/panel-sayfasi";
import {
  TemaAyarlariEkrani,
  TemaAyarlariEylemleri,
} from "../../../../../../yonetim-paneli/tema/ayarlar-ekrani";
import { temaAyarlariVerisi } from "../../../../../../yonetim-paneli/tema/ayarlar-verisi";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("tema-ayarlari");

export default async function TemaAyarlariSayfasi() {
  await panelSayfasiniAc("tema-ayarlari");
  const { yetkili } = await panelOturumu();
  const izinli = yetkili("tema.degistir");
  const veri = await temaAyarlariVerisi();
  return (
    <PanelSayfasi
      kod="tema-ayarlari"
      eylemler={
        <TemaAyarlariEylemleri sira={veri.sira} degistirebilir={izinli && veri.degistirilebilir} />
      }
    >
      <TemaAyarlariEkrani
        veri={veri}
        izinli={izinli}
        logoIzni={yetkili("magaza-ayarlari.degistir")}
      />
    </PanelSayfasi>
  );
}
