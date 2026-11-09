"use client";
// Örneklerin metinleri gelistirme.ornek altındadır (kart 0104).
import { useMetin } from "../../metinler/istemci-metni";
import type { MetinAnahtari } from "../../metinler/metin";

export const useOrnekMetni = () => {
  const metin = useMetin();
  return (anahtar: string) => metin(`gelistirme.ornek.${anahtar}` as MetinAnahtari);
};
