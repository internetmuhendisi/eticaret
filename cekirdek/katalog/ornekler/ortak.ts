"use client";
import type { MetinAnahtari } from "../../metinler/metin";
// Örneklerin metinleri gelistirme.ornek altındadır (kart 0104).
import { usePanelMetni } from "../../metinler/panel-metni";

export const useOrnekMetni = () => {
  const metin = usePanelMetni();
  return (anahtar: string) => metin(`gelistirme.ornek.${anahtar}` as MetinAnahtari);
};
