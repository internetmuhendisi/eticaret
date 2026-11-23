"use client";
// Açılır panel (kart 0267; shadcn/ui popover). Tetikleyiciyle açılan küçük pencere: içinde form alanları durabilir
// (açılır menünün öğeleri ise yalnız seçimdir). Radix Popover: içerik "dialog" rolündedir, adı kullanan verir;
// açılınca odak içeriğe girer, Escape ve dışarı tıklama kapatır, odak tetikleyiciye döner. Sayfayı kilitlemez
// (açılır menü gibi): sayfanın geri kalanı ekran okuyucudan gizlenmez. Metinleri kullanan sayfa verir.
import { Popover } from "radix-ui";
import type { ComponentProps } from "react";
import { sinif } from "./sinif.ts";

export const AcilirPanel = Popover.Root;
export const AcilirPanelTetikleyici = Popover.Trigger;
export const AcilirPanelKapat = Popover.Close;

// İçerik ekranın kenarına en az 8 px yaklaşır; genişliği tasarım değerindendir (w-acilir), kullanan değiştirebilir.
export function AcilirPanelIcerigi({
  className,
  align = "start",
  sideOffset = 4,
  collisionPadding = 8,
  ...ozellikler
}: ComponentProps<typeof Popover.Content> & { "aria-label": string }) {
  return (
    <Popover.Portal>
      <Popover.Content
        data-slot="acilir-panel"
        align={align}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={sinif(
          "z-acilir flex w-acilir max-w-full flex-col gap-3 rounded-orta border border-kenar bg-zemin p-4 text-yazi shadow-acilir outline-none acik:animate-belir kapali:animate-kaybol",
          className,
        )}
        {...ozellikler}
      />
    </Popover.Portal>
  );
}
