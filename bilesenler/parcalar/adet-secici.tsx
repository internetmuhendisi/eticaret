"use client";
// Adet seçici (kart 0212; Canlı Çarşı taslağı): azalt, adet ve artır. Ürün sayfasında sepete eklenecek adet, sepette
// satırın adedi bununla değişir. Metinleri kullanan sayfa verir. Düğmeler 44 px'tir; sınırda olan düğme kapalıdır
// (en az adette azalt, en çok adette artır). Adet değişince ekran okuyucuya duyurulur (aria-live).
import { IkonDugmesi } from "./dugme.tsx";
import { sinif } from "./sinif.ts";

export function AdetSecici({
  deger,
  enAz = 1,
  enCok,
  onDegerDegisti,
  etiketler,
  className,
}: {
  deger: number;
  enAz?: number;
  enCok: number;
  onDegerDegisti: (deger: number) => void;
  // grup: seçicinin adı ("Adet"); azalt ve artır: düğmelerin adları (ürünün adıyla).
  etiketler: { grup: string; azalt: string; artir: string };
  className?: string;
}) {
  return (
    <fieldset
      data-slot="adet-secici"
      className={sinif(
        "m-0 inline-flex w-max min-w-0 shrink-0 items-center rounded-dugme border border-alan-kenari bg-zemin p-0",
        className,
      )}
    >
      <legend className="sr-only">{etiketler.grup}</legend>
      <IkonDugmesi
        ikon="azalt"
        etiket={etiketler.azalt}
        disabled={deger <= enAz}
        onClick={() => onDegerDegisti(Math.max(deger - 1, enAz))}
        className="disabled:bg-transparent"
      />
      <output aria-live="polite" className="min-w-8 text-center font-en-kalin">
        {deger}
      </output>
      <IkonDugmesi
        ikon="ekle"
        etiket={etiketler.artir}
        disabled={deger >= enCok}
        onClick={() => onDegerDegisti(Math.min(deger + 1, enCok))}
        className="disabled:bg-transparent"
      />
    </fieldset>
  );
}
