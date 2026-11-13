// Slider kısayolu (kart 0142, karar 0101): ana sayfadaki ilk kayan afişin formu; yoksa yeni slider formu.
import type { Metadata } from "next";
import { Uyari } from "../../../../../../bilesenler/parcalar/uyari";
import { metin } from "../../../../../metinler/site-metni";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../yonetim-paneli/panel-sayfasi";
import { panelSayfalari, sayfaTanimi } from "../../../../../yonetim-paneli/sayfa-agaci";
import { SliderEkrani } from "../../../../../yonetim-paneli/vitrin-bolumleri/slider";
import { bolumlerEkraniVerisi } from "../../../../../yonetim-paneli/vitrin-bolumleri/veri";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("slider");

export default async function SliderSayfasi() {
  await panelSayfasiniAc("slider");
  const veri = await bolumlerEkraniVerisi();
  return (
    <PanelSayfasi kod="slider">
      {veri.durum === "hazir" ? (
        <SliderEkrani
          veri={veri}
          bolumlerAdresi={sayfaTanimi(panelSayfalari, "vitrin-bolumleri")?.adres ?? ""}
        />
      ) : (
        <Uyari tur="bilgi">{metin("yonetim.bolumler.hata.katalog")}</Uyari>
      )}
    </PanelSayfasi>
  );
}
