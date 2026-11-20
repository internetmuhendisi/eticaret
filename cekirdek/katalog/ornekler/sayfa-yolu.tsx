"use client";
import { SayfaYolu } from "../../../bilesenler/parcalar/sayfa-yolu";
import { usePanelMetni } from "../../metinler/panel-metni";
import { useOrnekMetni } from "./ortak";

export function SayfaYoluOrnegi() {
  const m = useOrnekMetni();
  const metin = usePanelMetni();
  // İkinci yol kısa adlı komşu adımları ve telefonda iki satıra inen uzun bir adı gösterir (kart 0191): basılan
  // alanlar üst üste binmez.
  return (
    <div className="flex flex-col gap-4">
      <SayfaYolu
        etiket={metin("ortak.parca.sayfaYolu")}
        ayrac={metin("ortak.parca.sayfaYoluAyraci")}
        adimlar={[
          { ad: m("yolAnasayfa"), adres: "/" },
          { ad: m("yolGiyim"), adres: "/kategori/giyim" },
          { ad: m("yolTisort"), adres: "/urun/cizgili-pantolon" },
        ]}
      />
      <SayfaYolu
        etiket={metin("ortak.parca.sayfaYolu")}
        ayrac={metin("ortak.parca.sayfaYoluAyraci")}
        adimlar={[
          { ad: m("yolAnasayfa"), adres: "/" },
          { ad: m("yolKisa1"), adres: "/kategori/ev" },
          { ad: m("yolKisa2"), adres: "/kategori/su" },
          { ad: m("yolUzun"), adres: "/kategori/bahce" },
          { ad: m("yolTisort"), adres: "/urun/cizgili-pantolon" },
        ]}
      />
    </div>
  );
}
