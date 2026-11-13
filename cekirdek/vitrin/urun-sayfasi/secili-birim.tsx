"use client";
// Ürün sayfasında seçili birim (kart 0144, karar 0117). Üst kısım seçimi tutar ve bunu sağlar; eklentinin ürün
// sayfası yuvasındaki parça (stoğa gelince haber ver formu) seçili birime göre çizilir. Seçim tamamlanmamışsa birim
// yoktur.
import { createContext, useContext } from "react";

export const SeciliBirimBaglami = createContext<string | undefined>(undefined);

export const useSeciliBirim = (): string | undefined => useContext(SeciliBirimBaglami);
