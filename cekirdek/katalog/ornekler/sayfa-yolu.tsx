"use client";
import { SayfaYolu } from "../../../bilesenler/parcalar/sayfa-yolu";
import { useMetin } from "../../metinler/istemci-metni";
import { useOrnekMetni } from "./ortak";

export function SayfaYoluOrnegi() {
  const m = useOrnekMetni();
  const metin = useMetin();
  return (
    <SayfaYolu
      etiket={metin("ortak.parca.sayfaYolu")}
      ayrac={metin("ortak.parca.sayfaYoluAyraci")}
      adimlar={[
        { ad: m("yolAnasayfa"), adres: "/" },
        { ad: m("yolGiyim"), adres: "/kategori/giyim" },
        { ad: m("yolTisort"), adres: "/urun/cizgili-pantolon" },
      ]}
    />
  );
}
