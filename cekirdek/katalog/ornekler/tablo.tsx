"use client";
// Tablo örneği (kart 0258): başlık satırında sayfanın seçimi, satırlarda tek tek seçim; panel listeleri bunu liste
// motoruyla kurar (cekirdek/yonetim-paneli/liste/).
import { useState } from "react";
import {
  Tablo,
  TabloBasHucresi,
  TabloBasligi,
  TabloGovdesi,
  TabloHucresi,
  TabloSatiri,
  TabloUstu,
} from "../../../bilesenler/parcalar/tablo";
import { TabloSecimi } from "../../../bilesenler/parcalar/tablo-secimi";
import { doldur } from "../../metinler/doldur";
import { useOrnekMetni } from "./ortak";

const satirlar = [
  ["urunBir", "stokBir"],
  ["urunIki", "stokIki"],
  ["urunUc", "stokUc"],
] as const;

export function TabloOrnegi() {
  const m = useOrnekMetni();
  const [secilen, setSecilen] = useState<ReadonlySet<string>>(new Set(["urunIki"]));
  const hepsi =
    secilen.size === 0 ? false : secilen.size === satirlar.length ? true : ("kismen" as const);
  return (
    <Tablo className="text-kucuk">
      <TabloBasligi className="sr-only">{m("tablo.baslik")}</TabloBasligi>
      <TabloUstu>
        <TabloSatiri className="text-soluk-yazi">
          <TabloBasHucresi scope="col" className="w-11 px-1">
            <TabloSecimi
              etiket={m("tablo.hepsiniSec")}
              isaretli={hepsi}
              degisince={(isaretli) =>
                setSecilen(new Set(isaretli ? satirlar.map(([ad]) => ad) : []))
              }
            />
          </TabloBasHucresi>
          <TabloBasHucresi scope="col" className="px-3 py-2 font-normal">
            {m("tablo.urun")}
          </TabloBasHucresi>
          <TabloBasHucresi scope="col" className="px-3 py-2 text-right font-normal">
            {m("tablo.stok")}
          </TabloBasHucresi>
        </TabloSatiri>
      </TabloUstu>
      <TabloGovdesi>
        {satirlar.map(([ad, stok]) => (
          <TabloSatiri key={ad} className="last:border-b-0">
            <TabloHucresi className="px-1 py-1">
              <TabloSecimi
                etiket={doldur(m("tablo.sec"), { ad: m(`tablo.${ad}`) })}
                isaretli={secilen.has(ad)}
                degisince={(isaretli) =>
                  setSecilen((onceki) => {
                    const yeni = new Set(onceki);
                    if (isaretli) yeni.add(ad);
                    else yeni.delete(ad);
                    return yeni;
                  })
                }
              />
            </TabloHucresi>
            <TabloHucresi className="px-3 py-3 font-kalin">{m(`tablo.${ad}`)}</TabloHucresi>
            <TabloHucresi className="px-3 py-3 text-right">{m(`tablo.${stok}`)}</TabloHucresi>
          </TabloSatiri>
        ))}
      </TabloGovdesi>
    </Tablo>
  );
}
