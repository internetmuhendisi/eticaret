"use client";
// Panel eyleminin düğmesi ve bağlantısı (kart 0141): ikon ve ad eylem kaydından gelir (eylemler.ts). Komut
// çubuğunda dolu renkli tek düğme sayfanın asıl eylemidir ("asil"); ötekiler sadedir.
import type { ComponentProps } from "react";
import { Baglanti } from "../../bilesenler/parcalar/baglanti";
import { Dugme } from "../../bilesenler/parcalar/dugme";
import { doldur } from "../metinler/doldur";
import { usePanelMetni } from "../metinler/panel-metni";
import { type PanelEylemi, panelEylemleri } from "./eylemler";
import { PanelIkon } from "./panel-ikon";

type EylemOzellikleri = {
  eylem: PanelEylemi;
  // Sayfanın asıl eylemi: komut çubuğunda yalnız bir tane.
  asil?: boolean;
  // Adı "{ne}" taşıyan eylemin nesnesi, örneğin "Bölüm".
  ne?: string;
};

const useEylemAdi = ({ eylem, ne }: EylemOzellikleri): string => {
  const metin = usePanelMetni();
  return doldur(metin(panelEylemleri[eylem].ad), { ne: ne ?? "" }).trim();
};

export function EylemDugmesi({
  eylem,
  asil = false,
  ne,
  ...ozellikler
}: EylemOzellikleri & Omit<ComponentProps<typeof Dugme>, "children" | "tur">) {
  const ad = useEylemAdi({ eylem, ...(ne === undefined ? {} : { ne }) });
  return (
    <Dugme tur={asil ? "birincil" : "sade"} {...ozellikler}>
      <PanelIkon ad={panelEylemleri[eylem].ikon} />
      {ad}
    </Dugme>
  );
}

export function EylemBaglantisi({
  eylem,
  asil = false,
  cerceveli = false,
  ne,
  ...ozellikler
}: EylemOzellikleri &
  Omit<ComponentProps<typeof Baglanti>, "children" | "gorunum"> & {
    // Komut çubuğunun dışında, düğme dizisinde (panonun kısayolları, kart 0186): çerçeveli düğme.
    cerceveli?: boolean;
  }) {
  const ad = useEylemAdi({ eylem, ...(ne === undefined ? {} : { ne }) });
  return (
    <Baglanti gorunum={asil ? "birincil" : cerceveli ? "cerceveli" : "sade"} {...ozellikler}>
      <PanelIkon ad={panelEylemleri[eylem].ikon} />
      {ad}
    </Baglanti>
  );
}
