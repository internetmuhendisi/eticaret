"use client";
// Sayfanın hata ekranı (kart 0014). Bölüm sınırının (cekirdek/izleme/bolum.tsx) dışında kalan
// bir hata bütün sayfayı bu ekrana çevirir; kök düzen yerinde kalır.
import { useEffect } from "react";
import { istemciHatasiniKaydet } from "../../izleme/istemci-hata-katmani";
import { useMetin } from "../../metinler/istemci-metni";

export default function SayfaHatasi({ error }: { error: unknown }) {
  const metin = useMetin();
  useEffect(() => istemciHatasiniKaydet(error), [error]);
  return (
    <main>
      <p role="alert">{metin("ortak.hata.sayfaGosterilemiyor")}</p>
    </main>
  );
}
