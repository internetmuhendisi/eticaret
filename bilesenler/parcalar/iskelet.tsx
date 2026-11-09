// İskelet görünüm (kart 0103; shadcn/ui skeleton). İçerik yüklenirken yerini tutar. Ekran okuyucuya
// görünmez: yüklendiğini YukleniyorGostergesi ya da sayfanın kendisi söyler.
import type { HTMLAttributes } from "react";
import { sinif } from "./sinif.ts";

export function IskeletGorunum({ className, ...ozellikler }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      data-slot="iskelet"
      className={sinif("animate-nabiz rounded-orta bg-kenar", className)}
      {...ozellikler}
    />
  );
}
