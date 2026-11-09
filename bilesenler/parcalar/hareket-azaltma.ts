"use client";
// Kullanıcının hareketi azaltma tercihi (kart 0110, .claude/rules/erisilebilirlik.md). Kendiliğinden hareket
// eden parça (kayan afiş) bu tercihte kendiliğinden hareket etmez. Tercih değişince değer de değişir. Sunucuda
// ve ilk çizimde false'tur; tarayıcı tercihi okuyunca güncellenir.
import { useEffect, useState } from "react";

const sorguMetni = "(prefers-reduced-motion: reduce)";

export const useHareketAzaltma = (): boolean => {
  const [azalt, setAzalt] = useState(false);
  useEffect(() => {
    const sorgu = window.matchMedia(sorguMetni);
    setAzalt(sorgu.matches);
    const degisti = () => setAzalt(sorgu.matches);
    sorgu.addEventListener("change", degisti);
    return () => sorgu.removeEventListener("change", degisti);
  }, []);
  return azalt;
};
