// Menüler ekranı (kart 0143). Önce sayfanın izni denetlenir (izni olmayana bulunamadı), sonra menüler okunur; seçili
// menü adreste durur (?menu=<kimlik>). Değişiklikler tarayıcıdan menü uçlarına gider.
import type { Metadata } from "next";
import {
  MenulerEylemleri,
  MenulerIcerigi,
  MenulerSaglayici,
} from "../../../../../yonetim-paneli/menuler/ekran";
import { menulerEkraniVerisi } from "../../../../../yonetim-paneli/menuler/veri";
import { panelOturumu } from "../../../../../yonetim-paneli/panel-oturumu";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../yonetim-paneli/panel-sayfasi";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("menuler");

export default async function MenulerSayfasi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { sayfa } = await panelSayfasiniAc("menuler");
  const { yetkili } = await panelOturumu();
  const degistirebilir = yetkili("menu.degistir");
  const { menu } = await searchParams;
  const veri = await menulerEkraniVerisi(typeof menu === "string" ? menu : undefined);
  return (
    <MenulerSaglayici veri={veri} degistirebilir={degistirebilir} adres={sayfa.adres}>
      <PanelSayfasi kod="menuler" {...(degistirebilir ? { eylemler: <MenulerEylemleri /> } : {})}>
        <MenulerIcerigi />
      </PanelSayfasi>
    </MenulerSaglayici>
  );
}
