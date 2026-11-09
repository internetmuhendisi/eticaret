"use client";
// İpucu (kart 0103; shadcn/ui tooltip). Üzerine gelince ve klavyeyle odaklanınca görünür, Escape ile
// kapanır. Yalnız ek bilgidir: ipucunda yazan bilgi başka yoldan da (düğmenin adı gibi) verilir.
// Kapanırken animasyon yoktur, açılış animasyonu da kapanınca kesilir: Radix animasyonu süren ipucunu
// kaldırmaz, kapanmakta olan ipucu Escape'i boşa yutar ve altındaki pencere kapanmazdı (ölçüldü). Açık
// ipucu varken ilk Escape ipucunu, ikincisi pencereyi kapatır (WAI-ARIA'nın ipucu kalıbı).
import { Tooltip } from "radix-ui";
import type { ReactNode } from "react";
import { sinif } from "./sinif.ts";

export function Ipucu({
  metin,
  children,
  taraf = "top",
  className,
}: {
  metin: string;
  // İpucunu açan öğe: odaklanabilir tek bir öğe (düğme, bağlantı).
  children: ReactNode;
  taraf?: "top" | "right" | "bottom" | "left";
  className?: string;
}) {
  return (
    <Tooltip.Provider delayDuration={300}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            data-slot="ipucu"
            side={taraf}
            sideOffset={4}
            className={sinif(
              "z-acilir max-w-metin rounded-kucuk bg-yazi px-3 py-1.5 text-kucuk text-zemin not-kapali:animate-belir",
              className,
            )}
          >
            {metin}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
