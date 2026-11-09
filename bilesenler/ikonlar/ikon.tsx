// İkon (kart 0103). Yalnız süstür: ekran okuyucuya görünmez, anlamı yanındaki yazı ya da düğmenin adı
// verir. Yalnız ikonu olan düğme IkonDugmesi ile yazılır, onun adı zorunludur.
import { sinif } from "../parcalar/sinif.ts";
import { type IkonAdi, ikonlar } from "./sozluk.ts";

export function Ikon({ ad, className }: { ad: IkonAdi; className?: string }) {
  const Bilesen = ikonlar[ad];
  return (
    <Bilesen
      aria-hidden="true"
      focusable="false"
      className={sinif("pointer-events-none size-4 shrink-0", className)}
    />
  );
}
