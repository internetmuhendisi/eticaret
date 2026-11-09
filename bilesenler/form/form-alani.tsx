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
  children,
}: {
  etiket: string;
  aciklama?: string;
  hata?: string;
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
    <div className="flex flex-col gap-1">
      <Etiket htmlFor={id}>{etiket}</Etiket>
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
