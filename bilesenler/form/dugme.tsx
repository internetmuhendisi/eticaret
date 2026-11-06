// Ortak düğme. Metni kullanan sayfa verir. Form gönderemez: onun düğmesi form.tsx içindeki GonderDugmesi'dir.
import type { ButtonHTMLAttributes } from "react";
import { stil } from "./stil";

export function Dugme({
  type = "button",
  className,
  ...ozellikler
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & { type?: "button" | "reset" }) {
  return (
    <button
      type={type}
      className={className === undefined ? stil.dugme : `${stil.dugme} ${className}`}
      {...ozellikler}
    />
  );
}
