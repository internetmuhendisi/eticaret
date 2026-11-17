"use client";
// Açma-kapama anahtarı (kart 0214; taslak kart 0211, Radix Switch): panelde bir şeyin açık ya da kapalı olduğu
// (ödeme yöntemi). Ekran okuyucu "anahtar, açık" der; yanında durumun yazısı da görünür (yalnız renkle verilmez).
// Etiket ekran okuyucudaki addır (görünen ad satırın kendisindedir), durum yazıları kullanan sayfadan gelir. Bütün
// alan basılabilir, en az 44 px yüksektir. Kapalı (disabled) anahtar değiştirilemez, durumu yine okunur.
import { Switch } from "radix-ui";
import type { ComponentProps } from "react";
import { sinif } from "./sinif.ts";

export function Anahtar({
  etiket,
  acikYazisi,
  kapaliYazisi,
  checked,
  className,
  ...ozellikler
}: Omit<ComponentProps<typeof Switch.Root>, "children" | "aria-label"> & {
  etiket: string;
  acikYazisi: string;
  kapaliYazisi: string;
  checked: boolean;
}) {
  return (
    <Switch.Root
      data-slot="anahtar"
      aria-label={etiket}
      checked={checked}
      className={sinif(
        "group inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-kucuk px-1 text-govde text-yazi disabled:cursor-not-allowed disabled:text-soluk-yazi",
        className,
      )}
      {...ozellikler}
    >
      <span className="relative flex h-6 w-11 shrink-0 items-center rounded-dugme border-2 border-alan-kenari bg-yuzey transition-colors duration-kisa group-isaretli:border-yazi group-isaretli:bg-yazi">
        <Switch.Thumb className="block size-4 translate-x-0.5 rounded-dugme bg-alan-kenari transition-transform duration-kisa isaretli:translate-x-5 isaretli:bg-zemin" />
      </span>
      <span aria-hidden="true">{checked ? acikYazisi : kapaliYazisi}</span>
    </Switch.Root>
  );
}
