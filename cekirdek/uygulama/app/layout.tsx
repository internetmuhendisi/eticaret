import type { ReactNode } from "react";
import { MetinSaglayici } from "../../metinler/istemci-metni";
import { siteDili } from "../../metinler/site-metni";

export default function KokDuzen({ children }: { children: ReactNode }) {
  return (
    <html lang={siteDili}>
      <body>
        <MetinSaglayici dil={siteDili}>{children}</MetinSaglayici>
      </body>
    </html>
  );
}
