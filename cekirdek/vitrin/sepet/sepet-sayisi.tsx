"use client";
// Üst kısımdaki sepetin sayısı (kart 0212): sepetteki ayrı ürünlerin (kalemlerin) sayısı, tarayıcının deposundan; istek
// gitmez. Sıfırsa görünmez (kart 0108). Katalogun örnek kipinde bağlamın örnek sayısıdır.
import { useMetin } from "../../metinler/istemci-metni";
import { doldur } from "../../moduller/eposta/sablon";
import { useSepet, useSepetAyarlari } from "./durum";

export function SepetSayisi({ ornekSayi, className }: { ornekSayi?: number; className: string }) {
  const metin = useMetin();
  const { kip } = useSepetAyarlari();
  const sepet = useSepet();
  const sayi = kip === "ornek" ? (ornekSayi ?? 0) : sepet.kalemler.length;
  if (sayi === 0) return null;
  return (
    <>
      <span className="sr-only">{doldur(metin("vitrin.sepet.sayi"), { sayi: String(sayi) })}</span>
      <span aria-hidden="true" className={className}>
        {sayi}
      </span>
    </>
  );
}
