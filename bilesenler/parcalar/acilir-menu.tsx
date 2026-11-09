"use client";
// Açılır menü (kart 0103; shadcn/ui dropdown-menu). Tetikleyiciyle açılır, ok tuşlarıyla gezilir, Enter
// ile seçilir, Escape ile kapanır ve odak tetikleyiciye döner. Metinleri kullanan sayfa verir.
import { DropdownMenu } from "radix-ui";
import type { ComponentProps } from "react";
import { Ikon } from "../ikonlar/ikon.tsx";
import { sinif } from "./sinif.ts";

// Menü sayfayı kilitlemez (modal değil): açıkken sayfanın geri kalanı ekran okuyucudan gizlenmez. Kilitli
// menü sayfadaki odaklanabilir öğeleri aria-hidden altında bırakır (axe: aria-hidden-focus, ölçüldü).
// WAI-ARIA'nın menü düğmesi kalıbı kilit istemez; odak yine menüye girer, Escape ve dışarı tıklama kapatır.
export function AcilirMenu({
  modal = false,
  ...ozellikler
}: ComponentProps<typeof DropdownMenu.Root>) {
  return <DropdownMenu.Root modal={modal} {...ozellikler} />;
}
export const AcilirMenuTetikleyici = DropdownMenu.Trigger;
export const AcilirMenuGrubu = DropdownMenu.Group;
export const AcilirMenuRadyoGrubu = DropdownMenu.RadioGroup;
export const AltMenu = DropdownMenu.Sub;

const icerikSiniflari =
  "z-acilir overflow-y-auto rounded-orta border border-kenar bg-zemin p-1 text-yazi shadow-acilir acik:animate-belir kapali:animate-kaybol";

// Öğe parmakla rahat basılır, klavyeyle gelinen öğe yüzey rengindedir.
const ogeSiniflari =
  "relative flex min-h-11 cursor-pointer items-center gap-2 rounded-kucuk px-3 py-2 outline-none select-none vurgulu:bg-yuzey devre-disi:cursor-not-allowed devre-disi:text-soluk-yazi";

export function AcilirMenuIcerigi({
  className,
  sideOffset = 4,
  ...ozellikler
}: ComponentProps<typeof DropdownMenu.Content>) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        data-slot="acilir-menu-icerigi"
        sideOffset={sideOffset}
        className={sinif(icerikSiniflari, "menu-yuksekligi", className)}
        {...ozellikler}
      />
    </DropdownMenu.Portal>
  );
}

export function AcilirMenuOgesi({
  className,
  tur = "varsayilan",
  ...ozellikler
}: ComponentProps<typeof DropdownMenu.Item> & { tur?: "varsayilan" | "tehlike" }) {
  return (
    <DropdownMenu.Item
      data-slot="acilir-menu-ogesi"
      className={sinif(ogeSiniflari, tur === "tehlike" && "text-tehlike-yazi", className)}
      {...ozellikler}
    />
  );
}

export function AcilirMenuOnayOgesi({
  className,
  children,
  ...ozellikler
}: ComponentProps<typeof DropdownMenu.CheckboxItem>) {
  return (
    <DropdownMenu.CheckboxItem
      data-slot="acilir-menu-onay-ogesi"
      className={sinif(ogeSiniflari, "pl-10", className)}
      {...ozellikler}
    >
      <DropdownMenu.ItemIndicator className="absolute left-3 flex items-center">
        <Ikon ad="onay" />
      </DropdownMenu.ItemIndicator>
      {children}
    </DropdownMenu.CheckboxItem>
  );
}

export function AcilirMenuRadyoOgesi({
  className,
  children,
  ...ozellikler
}: ComponentProps<typeof DropdownMenu.RadioItem>) {
  return (
    <DropdownMenu.RadioItem
      data-slot="acilir-menu-radyo-ogesi"
      className={sinif(ogeSiniflari, "pl-10", className)}
      {...ozellikler}
    >
      <DropdownMenu.ItemIndicator className="absolute left-3 flex items-center">
        <Ikon ad="nokta" className="size-2 fill-current" />
      </DropdownMenu.ItemIndicator>
      {children}
    </DropdownMenu.RadioItem>
  );
}

export function AcilirMenuBasligi({
  className,
  ...ozellikler
}: ComponentProps<typeof DropdownMenu.Label>) {
  return (
    <DropdownMenu.Label
      data-slot="acilir-menu-basligi"
      className={sinif("px-3 py-2 text-kucuk font-kalin text-soluk-yazi", className)}
      {...ozellikler}
    />
  );
}

export function AcilirMenuAyraci({
  className,
  ...ozellikler
}: ComponentProps<typeof DropdownMenu.Separator>) {
  return (
    <DropdownMenu.Separator
      data-slot="acilir-menu-ayraci"
      className={sinif("-mx-1 my-1 h-px bg-kenar", className)}
      {...ozellikler}
    />
  );
}

export function AltMenuTetikleyici({
  className,
  children,
  ...ozellikler
}: ComponentProps<typeof DropdownMenu.SubTrigger>) {
  return (
    <DropdownMenu.SubTrigger
      data-slot="alt-menu-tetikleyici"
      className={sinif(ogeSiniflari, "acik:bg-yuzey", className)}
      {...ozellikler}
    >
      {children}
      <Ikon ad="alt-menu" className="ml-auto" />
    </DropdownMenu.SubTrigger>
  );
}

export function AltMenuIcerigi({
  className,
  ...ozellikler
}: ComponentProps<typeof DropdownMenu.SubContent>) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.SubContent
        data-slot="alt-menu-icerigi"
        className={sinif(icerikSiniflari, className)}
        {...ozellikler}
      />
    </DropdownMenu.Portal>
  );
}
