// Bütün panel sayfalarının dış düzeni. Panel bütün sitelerde aynı değerlerle çizilir, siteden yalnız ana rengi
// alır (kart 0105): bu değerler kök düzenin yazdığı vitrin değerlerinden sonra gelir ve onların yerine geçer.
// Giriş sayfalarının sade düzeni giris/layout.tsx, girişli panelin çerçevesi (panel)/layout.tsx içindedir.
import type { ReactNode } from "react";
import { panelTasarimCss } from "../../../temalar/birlesim";

export default async function PanelDisDuzeni({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{await panelTasarimCss()}</style>
      {children}
    </>
  );
}
