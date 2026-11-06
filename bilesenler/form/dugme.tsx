// Ortak düğme. Metni kullanan sayfa verir.
import type { ButtonHTMLAttributes } from "react";
import { stil } from "./stil";

export function Dugme({
  type = "button",
  className,
  ...ozellikler
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={className === undefined ? stil.dugme : `${stil.dugme} ${className}`}
      {...ozellikler}
    />
  );
}
