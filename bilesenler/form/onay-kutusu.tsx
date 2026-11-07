// Ortak onay kutusu. Etiket ve hata kutuya bağlıdır, metni kullanan sayfa verir. Etiketin yanına konacak
// bağlantı "ek" ile verilir: bağlantı etiketin içinde olursa ona dokunmak kutuyu da işaretlerdi.
import { type InputHTMLAttributes, type ReactNode, useId } from "react";
import { stil } from "./stil";

export function OnayKutusu({
  etiket,
  hata,
  ek,
  ...ozellikler
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "id" | "className"> & {
  etiket: string;
  hata?: string | undefined;
  ek?: ReactNode;
}) {
  const id = useId();
  const hataKimligi = `${id}-hata`;
  return (
    <div className={stil.onay}>
      <label htmlFor={id} className={stil.onayEtiketi}>
        <input
          type="checkbox"
          id={id}
          className={stil.onayKutusu}
          {...(hata === undefined ? {} : { "aria-invalid": true, "aria-describedby": hataKimligi })}
          {...ozellikler}
        />
        <span>{etiket}</span>
      </label>
      {ek}
      {hata === undefined ? null : (
        <span id={hataKimligi} className={stil.hata}>
          {hata}
        </span>
      )}
    </div>
  );
}
