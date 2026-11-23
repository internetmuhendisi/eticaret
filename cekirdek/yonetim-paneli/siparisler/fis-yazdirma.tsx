"use client";
// Sipariş fişinin yazdırması (kart 0270): komut çubuğundaki "Yazdır" ve ayrıntıdan ya da listeden gelince
// (?yazdir=1) sayfa açılır açılmaz bir kez tarayıcının yazdırma penceresi. Yazdırırken panelin çerçevesi gizlidir.
import { useEffect, useRef } from "react";
import { EylemDugmesi } from "../eylem-dugmesi";

export function FisYazdirma({ otomatik }: { otomatik: boolean }) {
  const yazdirildi = useRef(false);
  useEffect(() => {
    if (!otomatik || yazdirildi.current) return;
    yazdirildi.current = true;
    window.print();
  }, [otomatik]);
  return <EylemDugmesi eylem="yazdir" asil onClick={() => window.print()} />;
}
