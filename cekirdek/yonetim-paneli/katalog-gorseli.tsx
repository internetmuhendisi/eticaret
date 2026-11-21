"use client";
// Kategori ve marka satırının küçük görseli (kart 0261, taslak): seçili görselin panel önizlemesi, yoksa ya da
// açılamazsa (dosya kaybolmuş) görsel ikonu; kırık görsel işareti görünmez. Görsel süstür: adı satırın yazısındadır,
// ekran okuyucu atlar.
import { useState } from "react";
import { Ikon } from "../../bilesenler/ikonlar/ikon";
import { sinif } from "../../bilesenler/parcalar/sinif";
import { panelGorseliAdresi } from "./gorsel-secimi";

export function KatalogGorseli({
  gorsel,
  className,
}: {
  gorsel: string | undefined;
  // Kullanan ekranın yerleşimi (kategori ağacında telefonda gizlenir).
  className?: string;
}) {
  const [acilmadi, setAcilmadi] = useState<string | null>(null);
  if (gorsel === undefined || acilmadi === gorsel) {
    return (
      <span
        aria-hidden="true"
        className={sinif(
          "flex size-12 shrink-0 items-center justify-center rounded-kucuk border border-kenar bg-yuzey text-soluk-yazi",
          className,
        )}
      >
        <Ikon ad="gorsel" />
      </span>
    );
  }
  return (
    // biome-ignore lint/performance/noImgElement: panelin küçük önizlemesi, boyutu uçtan gelir.
    <img
      src={panelGorseliAdresi(gorsel)}
      alt=""
      loading="lazy"
      onError={() => setAcilmadi(gorsel)}
      className={sinif(
        "size-12 shrink-0 rounded-kucuk border border-kenar bg-yuzey object-cover",
        className,
      )}
    />
  );
}
