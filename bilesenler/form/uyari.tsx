// Sayfa içi uyarı kutusu. Ekran okuyucu görünür görünmez okur; anlamı yazıyla verilir, renkle değil.
import type { ReactNode } from "react";
import { stil } from "./stil";

export function Uyari({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className={stil.uyari}>
      {children}
    </div>
  );
}
