// Fiyat bileşeni (kart 0109, karar 0085), sunucuda: çizim fiyat-cizimi.tsx'tedir, burada yalnız ekran okuyucu
// etiketleri sitenin metninden verilir (kart 0212). Vitrin fiyatı her yerde bununla ya da tarayıcıda sepetin
// sarmalayıcısıyla gösterir (.claude/rules/vitrin.md).
import { metin } from "../../metinler/site-metni";
import { type FiyatBoyutu, FiyatCizimi } from "./fiyat-cizimi";
import type { GosterimFiyati } from "./fiyat-turu";

export type { FiyatBoyutu } from "./fiyat-cizimi";

export function FiyatGosterimi({
  fiyat,
  boyut = "normal",
  className,
}: {
  fiyat: GosterimFiyati;
  boyut?: FiyatBoyutu;
  className?: string;
}) {
  return (
    <FiyatCizimi
      fiyat={fiyat}
      boyut={boyut}
      {...(className === undefined ? {} : { className })}
      etiketler={{
        indirimliFiyat: metin("vitrin.fiyat.indirimliFiyat"),
        eskiFiyat: metin("vitrin.fiyat.eskiFiyat"),
      }}
    />
  );
}
