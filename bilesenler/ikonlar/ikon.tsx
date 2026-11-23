// İkon (kart 0103). Yalnız süstür: ekran okuyucuya görünmez, anlamı yanındaki yazı ya da düğmenin adı
// verir. Yalnız ikonu olan düğme IkonDugmesi ile yazılır, onun adı zorunludur.
import { sinif } from "../parcalar/sinif.ts";
import { type IkonAdi, type IkonBileseni, ikonlar } from "./sozluk.ts";

// `ad` sözlükteki adı ya da sözlükten alınmış ikonu alır: panel kendi sözlüğündeki ikonu böyle verir (kart 0295,
// cekirdek/yonetim-paneli/panel-ikon.tsx).
export function Ikon({ ad, className }: { ad: IkonAdi | IkonBileseni; className?: string }) {
  const Bilesen = typeof ad === "string" ? ikonlar[ad] : ad;
  return (
    <Bilesen
      aria-hidden="true"
      focusable="false"
      className={sinif("pointer-events-none size-4 shrink-0", className)}
    />
  );
}
