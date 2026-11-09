// Bileşen kataloğu (kart 0104, karar 0078). Yalnız geliştirmede ve deneme ortamındaki kutuda açılır;
// canlı kutuda ve ortamı bilinmeyen kutuda adres yoktur (404). Asıl kapı ara katmandadır (proxy.ts),
// düzen ve sayfalar ikinci kapıyı ayrıca çağırır. Arama motorlarına kapalıdır.
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { katalogKapisi } from "../../../../katalog/kapi";
import { KatalogBildirimAlani } from "../../../../katalog/ornekler/bildirim";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function KatalogDuzeni({ children }: { children: ReactNode }) {
  katalogKapisi();
  return (
    <>
      <KatalogBildirimAlani />
      {children}
    </>
  );
}
