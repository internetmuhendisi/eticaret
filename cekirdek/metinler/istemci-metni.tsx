"use client";
// Tarayıcıda çalışan ekranların metin okuyucusu (.claude/rules/metinler.md). Sitenin dili
// sunucuda okunur ve kök düzen tarafından buraya verilir; tarayıcı site klasörünü okuyamaz.
import { createContext, type ReactNode, useContext } from "react";
import { type Dil, metinOkuyucu } from "./metin";

const DilBaglami = createContext<Dil | undefined>(undefined);

export function MetinSaglayici({ dil, children }: { dil: Dil; children: ReactNode }) {
  return <DilBaglami.Provider value={dil}>{children}</DilBaglami.Provider>;
}

export const useMetin = () => {
  const dil = useContext(DilBaglami);
  if (dil === undefined) {
    throw new Error("useMetin yalnız MetinSaglayici'nin içinde kullanılır (kök düzen).");
  }
  return metinOkuyucu(dil);
};
