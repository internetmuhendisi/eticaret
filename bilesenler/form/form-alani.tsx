// Her alanın etiketini ve hata mesajını aynı biçimde gösterir (.claude/rules/formlar.md). Alan bu
// sarmalayıcının verdiği kimliği ve hata bağlantısını alır, ekran okuyucu ikisini birlikte okur.
import { type ReactNode, useId } from "react";
import { Etiket } from "../parcalar/etiket.tsx";

export type AlanBaglantisi = {
  id: string;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
};

export function FormAlani({
  etiket,
  aciklama,
  hata,
  ad,
  etiketEki,
  children,
}: {
  etiket: string;
  aciklama?: string;
  hata?: string;
  // Alanın formdaki adı (kart 0259): hata özeti ve odak alanı bununla bulur (data-alan).
  ad?: string;
  // Etiketin yanındaki işaret: zorunlu alanın yıldızı ya da "(isteğe bağlı)"; metni kullanan verir.
  etiketEki?: ReactNode;
  children: (alan: AlanBaglantisi) => ReactNode;
}) {
  const id = useId();
  const hataKimligi = `${id}-hata`;
  const aciklamaKimligi = `${id}-aciklama`;
  const bagli = [
    ...(aciklama === undefined ? [] : [aciklamaKimligi]),
    ...(hata === undefined ? [] : [hataKimligi]),
  ].join(" ");
  return (
    <div
      className="flex flex-col gap-1"
      {...(ad === undefined ? {} : { "data-alan": ad, "data-alan-etiketi": etiket })}
    >
      {etiketEki === undefined ? (
        <Etiket htmlFor={id}>{etiket}</Etiket>
      ) : (
        // Ek etiketin dışındadır: alanın adı yalnız etikettir (zorunluluk alanın kendisinde, aria-required).
        <span className="flex flex-wrap items-baseline gap-x-1">
          <Etiket htmlFor={id}>{etiket}</Etiket>
          {etiketEki}
        </span>
      )}
      {children({
        id,
        ...(hata === undefined ? {} : { "aria-invalid": true as const }),
        ...(bagli === "" ? {} : { "aria-describedby": bagli }),
      })}
      {aciklama === undefined ? null : (
        <span id={aciklamaKimligi} className="text-kucuk text-soluk-yazi">
          {aciklama}
        </span>
      )}
      {hata === undefined ? null : (
        <span id={hataKimligi} className="font-kalin text-tehlike-yazi">
          {hata}
        </span>
      )}
    </div>
  );
}
