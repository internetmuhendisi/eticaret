// Ortak giriş alanı. Etiket ve hata FormAlani ile gelir.
import type { InputHTMLAttributes } from "react";
import { stil } from "./stil";

export function GirisAlani({ className, ...ozellikler }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={className === undefined ? stil.giris : `${stil.giris} ${className}`}
      {...ozellikler}
    />
  );
}
