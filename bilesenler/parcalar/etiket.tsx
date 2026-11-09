"use client";
// Alan etiketi (kart 0103; shadcn/ui label). Alanla bağı htmlFor ile kurulur; FormAlani bunu kendisi yapar.
import { Label } from "radix-ui";
import type { ComponentProps } from "react";
import { sinif } from "./sinif.ts";

export function Etiket({ className, ...ozellikler }: ComponentProps<typeof Label.Root>) {
  return (
    <Label.Root
      data-slot="etiket"
      className={sinif("font-orta text-yazi", className)}
      {...ozellikler}
    />
  );
}
