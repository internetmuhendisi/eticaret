// Bileşen deneme sahnesi (kart 0103). Yalnız geliştirmede vardır (next.config.ts, pageExtensions); canlı
// derlemeye girmez. Ortak parçalar burada gerçek tarayıcıda, klavyeyle ve erişilebilirlik taramasıyla
// denenir (cekirdek/testler/uctan-uca/bilesenler.test.ts). Bileşen kataloğu (kart 0104) bunun üstüne kurulur.
import type { Metadata } from "next";
import { metin } from "../../../../metinler/site-metni";
import { BilesenSahnesi } from "../../../../testler/sahne/bilesen-sahnesi";

export const generateMetadata = (): Metadata => ({ title: metin("gelistirme.sahne.baslik") });

export default function BilesenDenemeSahnesi() {
  return <BilesenSahnesi />;
}
