"use client";
// Tarayıcıda çalışan ekranların metin okuyucusu (.claude/rules/metinler.md). Sitenin dili sunucuda okunur ve kök düzen
// tarafından buraya verilir; tarayıcı site klasörünü okuyamaz.
//
// Vitrinin tarayıcı koduna bütün metin dosyası değil yalnız vitrin metinleri gider (kart 0253, karar 0152):
// `useMetin` vitrin-metinleri.json'u okur ve yalnız vitrinMetinBolumleri'nin anahtarlarını kabul eder; başka bölümün
// anahtarı tür kontrolünde hatadır. Panel ve katalog ekranları bütün dosyayı `usePanelMetni` ile okur (panel-metni.tsx).
import { createContext, type ReactNode, useContext } from "react";
import type { Dil } from "./dil";
import type { MetinAnahtari } from "./metin";
import { sozluktenOkuyucu } from "./okuyucu";
import type { VitrinMetinBolumu } from "./vitrin-bolumleri";
import vitrinMetinleri from "./vitrin-metinleri.json" with { type: "json" };

// Vitrinin tarayıcı kodunun okuyabildiği anahtarlar.
export type VitrinMetinAnahtari = Extract<MetinAnahtari, `${VitrinMetinBolumu}.${string}`>;

const DilBaglami = createContext<Dil | undefined>(undefined);

export function MetinSaglayici({ dil, children }: { dil: Dil; children: ReactNode }) {
  return <DilBaglami.Provider value={dil}>{children}</DilBaglami.Provider>;
}

// Sağlayıcının dili (panelin okuyucusu da kullanır).
export const useDil = (): Dil => {
  const dil = useContext(DilBaglami);
  if (dil === undefined) {
    throw new Error("Metin okuyucu yalnız MetinSaglayici'nin içinde kullanılır (kök düzen).");
  }
  return dil;
};

// Kök düzen yokken (kök hata ekranı) dil bilinerek kullanılan vitrin okuyucusu.
export const vitrinMetinOkuyucu = (dil: Dil) =>
  sozluktenOkuyucu<VitrinMetinAnahtari>(vitrinMetinleri[dil], dil);

export const useMetin = () => vitrinMetinOkuyucu(useDil());
