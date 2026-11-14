// Bağlantı (kart 0034, 0103). Parmakla rahat basılır, alt çizgisi vardır, yazısı kalındır ("Tümünü gör",
// "İncele"). Düğme görünümlü bağlantı "gorunum" ile yazılır. Metni kullanan sayfa verir.
import Link from "next/link";
import type { ComponentProps } from "react";
import { type DugmeTuru, dugmeSiniflari } from "./dugme.tsx";
import { sinif } from "./sinif.ts";

export function Baglanti({
  className,
  gorunum = "baglanti",
  ...ozellikler
}: ComponentProps<typeof Link> & { gorunum?: DugmeTuru }) {
  return (
    <Link
      data-slot="baglanti"
      className={sinif(
        dugmeSiniflari({ tur: gorunum }),
        // Düz bağlantı sola yaslıdır: iki satıra inen yazı da öyle kalır (düğmenin text-center'ı ortalardı, kart 0130).
        gorunum === "baglanti" && "justify-start text-left font-kalin",
        className,
      )}
      {...ozellikler}
    />
  );
}
