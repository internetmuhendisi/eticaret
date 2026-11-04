import type { ReactNode } from "react";
import { MetinSaglayici } from "../../metinler/istemci-metni";
import { siteDili } from "../../metinler/site-metni";

// Bütün sayfalar sitenin ayarlarına bağlıdır, bu yüzden derlemede değil istekte hazırlanır
// (kart 0035, karar 0026). Site klasörü süreç açılırken bir kez okunur ve bellekte kalır.
export const dynamic = "force-dynamic";

export default function KokDuzen({ children }: { children: ReactNode }) {
  const dil = siteDili();
  return (
    <html lang={dil}>
      <body>
        <MetinSaglayici dil={dil}>{children}</MetinSaglayici>
      </body>
    </html>
  );
}
