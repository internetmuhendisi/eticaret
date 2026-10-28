import type { ReactNode } from "react";
import { siteDili } from "../../metinler/site-metni";

export default function KokDuzen({ children }: { children: ReactNode }) {
  return (
    <html lang={siteDili}>
      <body>{children}</body>
    </html>
  );
}
