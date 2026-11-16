"use client";
// Fiyat bileşeninin tarayıcıdaki sarmalayıcısı (kart 0212): sepet tarayıcıda çizilir, fiyatı JSON olarak gelir. Çizim
// sunucudakiyle aynıdır (FiyatCizimi), yalnız ekran okuyucu etiketleri tarayıcının metninden verilir.
import { useMetin } from "../../metinler/istemci-metni";
import { type FiyatBoyutu, FiyatCizimi } from "../urun-karti/fiyat-cizimi";
import type { GosterimFiyati } from "../urun-karti/fiyat-turu";

export function SepetFiyati({
  fiyat,
  boyut = "normal",
  className,
}: {
  fiyat: GosterimFiyati;
  boyut?: FiyatBoyutu;
  className?: string;
}) {
  const metin = useMetin();
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
