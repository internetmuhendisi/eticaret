// Vitrin hata sayfasının denemesi (kart 0120, karar 0104): vitrin çerçevesinin içinde bilerek hata veren sayfa.
// Tarayıcı testi hata sayfasının üst ve alt kısımla açıldığını bununla ölçer
// (cekirdek/testler/uctan-uca/durum-sayfalari.test.ts).
//
// Yalnız geliştirmede açılır: ara katman (proxy.ts) ve katalog kapısı katalog kapalıyken 404 verir; deneme
// ortamında katalog açıktır, ama deneme adresi internete açık olduğu için bu sayfa orada da 404'tür (her istek hata
// izleme aracına bir kayıt yazardı). Arama motorlarına kapalıdır.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { katalogKapisi } from "../../../../../katalog/kapi";

const gelistirmedeMi = () => process.env.NODE_ENV === "development";

export const generateMetadata = (): Metadata => {
  katalogKapisi();
  if (!gelistirmedeMi()) notFound();
  return { robots: { index: false, follow: false } };
};

export default function HataDenemesi(): never {
  katalogKapisi();
  if (!gelistirmedeMi()) notFound();
  throw new Error("Vitrin hata sayfasının denemesi (kart 0120).");
}
