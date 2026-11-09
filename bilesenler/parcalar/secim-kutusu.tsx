"use client";
// Seçim kutusu (kart 0103; shadcn/ui select). Klavyeyle açılır (Enter, boşluk, ok tuşları), harfle arar,
// Escape ile kapanır. Form içinde Radix gizli bir seçim alanı tutar: değer FormData'da name ile gelir.
// Etiket FormAlani ile gelir; tetikleyici alanın kimliğini alır.
import { Select } from "radix-ui";
import type { ComponentProps } from "react";
import { Ikon } from "../ikonlar/ikon.tsx";
import { disariyiKapatanRef } from "./disariyi-kapat.ts";
import { girisAlaniSiniflari } from "./giris-alani.tsx";
import { sinif } from "./sinif.ts";

export const SecimKutusu = Select.Root;
export const SecimGrubu = Select.Group;

export function SecimDegeri(ozellikler: ComponentProps<typeof Select.Value>) {
  return <Select.Value data-slot="secim-degeri" {...ozellikler} />;
}

export function SecimTetikleyici({
  className,
  children,
  ...ozellikler
}: ComponentProps<typeof Select.Trigger>) {
  return (
    <Select.Trigger
      data-slot="secim-tetikleyici"
      className={sinif(
        girisAlaniSiniflari,
        "flex cursor-pointer items-center justify-between gap-2 text-left yer-tutucu:text-soluk-yazi",
        className,
      )}
      {...ozellikler}
    >
      {children}
      <Select.Icon>
        <Ikon ad="asagi" className="text-soluk-yazi" />
      </Select.Icon>
    </Select.Trigger>
  );
}

export function SecimListesi({
  ref,
  className,
  children,
  position = "popper",
  ...ozellikler
}: ComponentProps<typeof Select.Content>) {
  return (
    <Select.Portal>
      <Select.Content
        data-slot="secim-listesi"
        ref={disariyiKapatanRef(ref)}
        position={position}
        sideOffset={4}
        className={sinif(
          "relative z-acilir secim-genisligi secim-yuksekligi overflow-y-auto rounded-orta border border-kenar bg-zemin text-yazi shadow-acilir acik:animate-belir kapali:animate-kaybol",
          className,
        )}
        {...ozellikler}
      >
        <Select.ScrollUpButton className="flex items-center justify-center py-1">
          <Ikon ad="yukari" />
        </Select.ScrollUpButton>
        <Select.Viewport className="p-1">{children}</Select.Viewport>
        <Select.ScrollDownButton className="flex items-center justify-center py-1">
          <Ikon ad="asagi" />
        </Select.ScrollDownButton>
      </Select.Content>
    </Select.Portal>
  );
}

export function SecimBasligi({ className, ...ozellikler }: ComponentProps<typeof Select.Label>) {
  return (
    <Select.Label
      data-slot="secim-basligi"
      className={sinif("px-3 py-2 text-kucuk text-soluk-yazi", className)}
      {...ozellikler}
    />
  );
}

export function SecimOgesi({
  className,
  children,
  ...ozellikler
}: ComponentProps<typeof Select.Item>) {
  return (
    <Select.Item
      data-slot="secim-ogesi"
      className={sinif(
        "relative flex min-h-11 cursor-pointer items-center gap-2 rounded-kucuk py-2 pr-10 pl-3 outline-none select-none vurgulu:bg-yuzey devre-disi:cursor-not-allowed devre-disi:text-soluk-yazi",
        className,
      )}
      {...ozellikler}
    >
      <Select.ItemText>{children}</Select.ItemText>
      <Select.ItemIndicator className="absolute right-3 flex items-center">
        <Ikon ad="onay" />
      </Select.ItemIndicator>
    </Select.Item>
  );
}

export function SecimAyraci({ className, ...ozellikler }: ComponentProps<typeof Select.Separator>) {
  return (
    <Select.Separator
      data-slot="secim-ayraci"
      className={sinif("-mx-1 my-1 h-px bg-kenar", className)}
      {...ozellikler}
    />
  );
}
