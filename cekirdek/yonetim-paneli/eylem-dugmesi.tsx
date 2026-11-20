"use client";
// Panel eyleminin düğmesi ve bağlantısı (kart 0141): ikon ve ad eylem kaydından gelir (eylemler.ts). Komut
// çubuğunda dolu renkli tek düğme sayfanın asıl eylemidir ("asil"); ötekiler sadedir.
import type { ComponentProps } from "react";
import { Ikon } from "../../bilesenler/ikonlar/ikon";
import { Baglanti } from "../../bilesenler/parcalar/baglanti";
import { Dugme } from "../../bilesenler/parcalar/dugme";
import { doldur } from "../metinler/doldur";
import { usePanelMetni } from "../metinler/panel-metni";
import { type PanelEylemi, panelEylemleri } from "./eylemler";

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
      <Ikon ad={panelEylemleri[eylem].ikon} />
      {ad}
    </Dugme>
  );
}

export function EylemBaglantisi({
  eylem,
  asil = false,
  ne,
  ...ozellikler
}: EylemOzellikleri & Omit<ComponentProps<typeof Baglanti>, "children" | "gorunum">) {
  const ad = useEylemAdi({ eylem, ...(ne === undefined ? {} : { ne }) });
  return (
    <Baglanti gorunum={asil ? "birincil" : "sade"} {...ozellikler}>
      <Ikon ad={panelEylemleri[eylem].ikon} />
      {ad}
    </Baglanti>
  );
}
