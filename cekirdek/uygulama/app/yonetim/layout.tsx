// Bütün panel sayfalarının dış düzeni. Altyapı adı burada, alt köşede küçük görünür (karar 0004).
// Panel bütün sitelerde aynı değerlerle çizilir, siteden yalnız ana rengi alır (kart 0105): bu değerler kök
// düzenin yazdığı vitrin değerlerinden sonra gelir ve onların yerine geçer.
import type { ReactNode } from "react";
import { altyapiAdi } from "../../../kayitlar/altyapi";
import { panelTasarimCss } from "../../../temalar/birlesim";
import { stil } from "../../../yonetim-paneli/stil";

export default async function PanelDisDuzeni({ children }: { children: ReactNode }) {
  return (
    <div className={stil.sarmal}>
      <style>{await panelTasarimCss()}</style>
      <div className={stil.icerik}>{children}</div>
      <small className={stil.altyapiAdi}>{altyapiAdi}</small>
    </div>
  );
}
