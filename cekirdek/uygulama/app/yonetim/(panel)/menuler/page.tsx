// Menüler ekranı (kart 0143). Önce sayfanın izni denetlenir (izni olmayana bulunamadı), sonra menüler okunur; seçili
// menü adreste durur (?menu=<kimlik>). Değişiklikler tarayıcıdan menü uçlarına gider.
import type { Metadata } from "next";
import { menuyeSayfaEkleParametresi } from "../../../../../yonetim-paneli/adresler";
import {
  MenulerEylemleri,
  MenulerIcerigi,
  MenulerSaglayici,
} from "../../../../../yonetim-paneli/menuler/ekran";
import {
  menulerEkraniVerisi,
  menuyeEklenecekSayfa,
} from "../../../../../yonetim-paneli/menuler/veri";
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
  const parametreler = await searchParams;
  const { menu } = parametreler;
  // Kart 0273: sayfa ekranının "Menüye ekle"si (?ekle-sayfa=<kimlik>): öğe penceresi o sayfa seçili açılır. Menü
  // verilmezse ilk elle kurulan menü seçilir.
  const eklenecek = parametreler[menuyeSayfaEkleParametresi];
  const hazirHedef =
    degistirebilir && typeof eklenecek === "string"
      ? await menuyeEklenecekSayfa(eklenecek)
      : undefined;
  const veri = await menulerEkraniVerisi(typeof menu === "string" ? menu : undefined, {
    elleMenuOnce: hazirHedef !== undefined,
  });
  return (
    <MenulerSaglayici
      veri={veri}
      degistirebilir={degistirebilir}
      adres={sayfa.adres}
      {...(hazirHedef === undefined ? {} : { hazirHedef })}
    >
      <PanelSayfasi kod="menuler" {...(degistirebilir ? { eylemler: <MenulerEylemleri /> } : {})}>
        <MenulerIcerigi />
      </PanelSayfasi>
    </MenulerSaglayici>
  );
}
