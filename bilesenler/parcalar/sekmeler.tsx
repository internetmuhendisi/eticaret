"use client";
// Sekmeler (kart 0103; shadcn/ui tabs). Ok tuşları sekmeler arasında gezer ve seçer, Tab içeriğe geçer.
// Sekmeler hap biçimindedir, seçili sekmenin zemini yazının rengidir; yalnız renkle değil, kalın yazıyla da
// ayrılır. Telefonda sığmayan sekmeler kendi
// şeridinde kayar, sayfa yana kaymaz.
import { Tabs } from "radix-ui";
import type { ComponentProps } from "react";
import { sinif } from "./sinif.ts";

export function Sekmeler({ className, ...ozellikler }: ComponentProps<typeof Tabs.Root>) {
  return (
    <Tabs.Root
      data-slot="sekmeler"
      className={sinif("flex flex-col gap-4", className)}
      {...ozellikler}
    />
  );
}

export function SekmeListesi({ className, ...ozellikler }: ComponentProps<typeof Tabs.List>) {
  return (
    <Tabs.List
      data-slot="sekme-listesi"
      className={sinif("flex w-fit max-w-full items-center gap-1.5 overflow-x-auto p-1", className)}
      {...ozellikler}
    />
  );
}

export function Sekme({ className, ...ozellikler }: ComponentProps<typeof Tabs.Trigger>) {
  return (
    <Tabs.Trigger
      data-slot="sekme"
      className={sinif(
        "inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-dugme border border-kenar px-4 whitespace-nowrap font-orta text-yazi transition-colors duration-kisa hover:bg-yuzey disabled:cursor-not-allowed etkin:border-yazi etkin:bg-yazi etkin:font-kalin etkin:text-zemin",
        className,
      )}
      {...ozellikler}
    />
  );
}

export function SekmeIcerigi({ className, ...ozellikler }: ComponentProps<typeof Tabs.Content>) {
  return <Tabs.Content data-slot="sekme-icerigi" className={sinif(className)} {...ozellikler} />;
}
