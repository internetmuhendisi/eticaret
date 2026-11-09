"use client";
// Katalogda seçilen renk sayfanın köküne yazılır (kart 0104): tasarım değerleri bu öznitelikle cihazın
// tercihini geçersiz kılar (bilesenler/tasarim-degerleri/css.ts). Açılır parçalar gövdeye çizildiği için
// öznitelik sayfanın kökündedir.
import { useEffect } from "react";
import { zorlananRenkOzniteligi } from "../../bilesenler/tasarim-degerleri/renk-ozniteligi";
import type { RenkSecenegi } from "./kayit";

export function RenkSecimi({ renk }: { renk: RenkSecenegi }) {
  useEffect(() => {
    const kok = document.documentElement;
    if (renk === "cihaz") kok.removeAttribute(zorlananRenkOzniteligi);
    else kok.setAttribute(zorlananRenkOzniteligi, renk);
    return () => kok.removeAttribute(zorlananRenkOzniteligi);
  }, [renk]);
  return null;
}
