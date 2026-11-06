// Bütün panel sayfalarının dış düzeni. Altyapı adı burada, alt köşede küçük görünür (karar 0004).
import type { ReactNode } from "react";
import { altyapiAdi } from "../../../kayitlar/altyapi";
import { stil } from "../../../yonetim-paneli/stil";

export default function PanelDisDuzeni({ children }: { children: ReactNode }) {
  return (
    <div className={stil.sarmal}>
      <div className={stil.icerik}>{children}</div>
      <small className={stil.altyapiAdi}>{altyapiAdi}</small>
    </div>
  );
}
