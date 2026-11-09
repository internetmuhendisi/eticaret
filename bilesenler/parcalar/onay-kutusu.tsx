"use client";
// Onay kutusu (kart 0033, 0103; shadcn/ui checkbox). Etiket ve hata kutuya bağlıdır, metni kullanan sayfa
// verir. Yazının tamamı kutuyu işaretler: dokunma alanı kutuyla sınırlı kalmaz. Etiketin yanına konacak
// bağlantı "ek" ile verilir: bağlantı etiketin içinde olursa ona dokunmak kutuyu da işaretlerdi.
// Form içinde Radix gizli bir onay alanı tutar: işaretli kutu FormData'da "on" değeriyle gelir.
import { Checkbox } from "radix-ui";
import { type ComponentProps, type ReactNode, useId } from "react";
import { Ikon } from "../ikonlar/ikon.tsx";
import { sinif } from "./sinif.ts";

export function OnayKutusu({
  etiket,
  hata,
  ek,
  className,
  ...ozellikler
}: Omit<ComponentProps<typeof Checkbox.Root>, "id" | "children"> & {
  etiket: string;
  hata?: string | undefined;
  ek?: ReactNode;
}) {
  const id = useId();
  const hataKimligi = `${id}-hata`;
  return (
    <div data-slot="onay-kutusu" className={sinif("flex flex-col gap-1", className)}>
      <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-2 py-2">
        <Checkbox.Root
          id={id}
          className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-kucuk border border-alan-kenari bg-zemin text-zemin disabled:cursor-not-allowed disabled:bg-yuzey aria-invalid:border-2 aria-invalid:border-tehlike isaretli:border-yazi isaretli:bg-yazi"
          {...(hata === undefined ? {} : { "aria-invalid": true, "aria-describedby": hataKimligi })}
          {...ozellikler}
        >
          <Checkbox.Indicator className="flex items-center justify-center">
            <Ikon ad="onay" />
          </Checkbox.Indicator>
        </Checkbox.Root>
        <span>{etiket}</span>
      </label>
      {ek}
      {hata === undefined ? null : (
        <span id={hataKimligi} className="font-kalin text-tehlike-yazi">
          {hata}
        </span>
      )}
    </div>
  );
}
