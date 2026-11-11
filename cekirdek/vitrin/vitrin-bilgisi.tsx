"use client";
// Vitrin çerçevesinin tarayıcıdaki ekranlara verdiği bilgi (kart 0120, karar 0104). Hata sayfası tarayıcı
// bileşenidir, veritabanına gidemez; mağaza adını (sekme başlığı) ve telefonu çerçevenin zaten okuduğu vitrin
// bağlamından buradan alır. Çerçeve okunamadıysa bilgi yoktur.
import { createContext, type ReactNode, useContext } from "react";

export type VitrinBilgisi = { magazaAdi?: string; telefon?: string };

const BilgiBaglami = createContext<VitrinBilgisi>({});

export function VitrinBilgisiSaglayici({
  bilgi,
  children,
}: {
  bilgi: VitrinBilgisi;
  children: ReactNode;
}) {
  return <BilgiBaglami.Provider value={bilgi}>{children}</BilgiBaglami.Provider>;
}

export const useVitrinBilgisi = () => useContext(BilgiBaglami);
