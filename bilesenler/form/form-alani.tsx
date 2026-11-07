// Her alanın etiketini ve hata mesajını aynı biçimde gösterir (.claude/rules/formlar.md). Alan bu
// sarmalayıcının verdiği kimliği ve hata bağlantısını alır, ekran okuyucu ikisini birlikte okur.
import { type ReactNode, useId } from "react";
import { stil } from "./stil";

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
    <div className={stil.alan}>
      <label htmlFor={id}>{etiket}</label>
      {children({
        id,
        ...(hata === undefined ? {} : { "aria-invalid": true as const }),
        ...(bagli === "" ? {} : { "aria-describedby": bagli }),
      })}
      {aciklama === undefined ? null : (
        <span id={aciklamaKimligi} className={stil.aciklama}>
          {aciklama}
        </span>
      )}
      {hata === undefined ? null : (
        <span id={hataKimligi} className={stil.hata}>
          {hata}
        </span>
      )}
    </div>
  );
}
