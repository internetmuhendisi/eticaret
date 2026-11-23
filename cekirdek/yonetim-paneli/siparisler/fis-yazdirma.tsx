"use client";
// Sipariş fişinin yazdırması (kart 0270): komut çubuğundaki "Yazdır" ve ayrıntıdan ya da listeden gelince
// (?yazdir=1) sayfa açılır açılmaz bir kez tarayıcının yazdırma penceresi. Yazdırırken panelin çerçevesi gizlidir.
// Pencere sayfanın görselleri (logo) ve yazı tipleri yüklendikten sonra açılır: yoksa ilk fiş logosuz basılabiliyordu
// (bağımsız kontrolün bulgusu; tarayıcı testi logoyu geciktirerek ölçer). Yüklenemeyen görsel beklemeyi durdurmaz.
import { useEffect, useRef } from "react";
import { EylemDugmesi } from "../eylem-dugmesi";

const yuklenenleriBekle = () =>
  Promise.all([
    document.fonts.ready,
    ...Array.from(document.images).map((gorsel) => gorsel.decode().catch(() => undefined)),
  ]);

export function FisYazdirma({ otomatik }: { otomatik: boolean }) {
  const yazdirildi = useRef(false);
  useEffect(() => {
    if (!otomatik || yazdirildi.current) return;
    yazdirildi.current = true;
    void yuklenenleriBekle().then(() => window.print());
  }, [otomatik]);
  return (
    <EylemDugmesi
      eylem="yazdir"
      asil
      onClick={() => void yuklenenleriBekle().then(() => window.print())}
    />
  );
}
