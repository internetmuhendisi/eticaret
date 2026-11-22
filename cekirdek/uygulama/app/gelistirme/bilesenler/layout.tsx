// Bileşen kataloğu (kart 0104, karar 0078). Yalnız geliştirmede ve deneme ortamındaki kutuda açılır;
// canlı kutuda ve ortamı bilinmeyen kutuda adres yoktur (404). Asıl kapı ara katmandadır (proxy.ts),
// düzen ve sayfalar ikinci kapıyı ayrıca çağırır. Arama motorlarına kapalıdır. Koyu tema sitenin ayarından bağımsız
// açıktır (kart 0290): katalog parçaları iki temada gösterir, değerleri kök düzenin vitrin değerlerinin üstüne yazar.
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { calisanSite } from "../../../../ayar-semasi/calisan-site";
import { katalogKapisi } from "../../../../katalog/kapi";
import { KatalogBildirimAlani } from "../../../../katalog/ornekler/bildirim";
import { katalogTasarimCss } from "../../../../temalar/birlesim";
import { siteninVeritabani } from "../../../../veritabani/baglanti";
import { vitrinTemasi } from "../../../../vitrin/tema-secimi";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function KatalogDuzeni({ children }: { children: ReactNode }) {
  katalogKapisi();
  return (
    <>
      <style>
        {await katalogTasarimCss(() => vitrinTemasi(siteninVeritabani(), calisanSite()))}
      </style>
      <KatalogBildirimAlani />
      {children}
    </>
  );
}
