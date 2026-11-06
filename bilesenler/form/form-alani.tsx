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
  hata,
  children,
}: {
  etiket: string;
  hata?: string;
  children: (alan: AlanBaglantisi) => ReactNode;
}) {
  const id = useId();
  const hataKimligi = `${id}-hata`;
  return (
    <div className={stil.alan}>
      <label htmlFor={id}>{etiket}</label>
      {children(
        hata === undefined ? { id } : { id, "aria-invalid": true, "aria-describedby": hataKimligi },
      )}
      {hata === undefined ? null : (
        <span id={hataKimligi} className={stil.hata}>
          {hata}
        </span>
      )}
    </div>
  );
}
