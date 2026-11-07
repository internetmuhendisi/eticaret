// Ortak bağlantı: parmakla rahat basılır. Metni kullanan sayfa verir.
import Link from "next/link";
import type { ComponentProps } from "react";
import { stil } from "./stil";

export function Baglanti({ className, ...ozellikler }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={className === undefined ? stil.baglanti : `${stil.baglanti} ${className}`}
      {...ozellikler}
    />
  );
}
