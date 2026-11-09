"use client";
// Yan pencere (kart 0103; shadcn/ui sheet). Pencerenin kenardan kayan biçimidir: menü, sepet, süzgeç gibi.
// Odak ve klavye davranışı pencereyle aynıdır. Telefonda ekranın tamamını kaplar.
import { Dialog } from "radix-ui";
import type { ComponentProps } from "react";
import { disaridaKalanaTiklama, disariyiKapatanRef } from "./disariyi-kapat.ts";
import { IkonDugmesi } from "./dugme.tsx";
import { ortuSiniflari } from "./pencere.tsx";
import { sinif } from "./sinif.ts";

export const YanPencere = Dialog.Root;
export const YanPencereTetikleyici = Dialog.Trigger;
export const YanPencereKapat = Dialog.Close;
export {
  PencereAciklamasi as YanPencereAciklamasi,
  PencereAlti as YanPencereAlti,
  PencereBasligi as YanPencereBasligi,
  PencereUstu as YanPencereUstu,
} from "./pencere.tsx";

const taraflar = {
  sag: "inset-y-0 right-0 h-full w-full border-l tablet:max-w-form acik:animate-sagdan-gir kapali:animate-saga-cik",
  sol: "inset-y-0 left-0 h-full w-full border-r tablet:max-w-form acik:animate-soldan-gir kapali:animate-sola-cik",
  alt: "inset-x-0 bottom-0 max-h-full border-t acik:animate-alttan-gir kapali:animate-alta-cik",
} as const;

export function YanPencereIcerigi({
  ref,
  onInteractOutside,
  className,
  children,
  kapatEtiketi,
  taraf = "sag",
  ...ozellikler
}: ComponentProps<typeof Dialog.Content> & {
  kapatEtiketi: string;
  taraf?: keyof typeof taraflar;
}) {
  return (
    <Dialog.Portal>
      {/* Örtü ve içerik aynı katmandadır; içerik sonra çizildiği için üstte durur. */}
      <Dialog.Overlay
        data-slot="yan-pencere-ortusu"
        className={sinif(ortuSiniflari, "z-yan-pencere")}
      />
      <Dialog.Content
        data-slot="yan-pencere-icerigi"
        ref={disariyiKapatanRef(ref)}
        onInteractOutside={(olay) => {
          disaridaKalanaTiklama(olay);
          onInteractOutside?.(olay);
        }}
        className={sinif(
          "fixed z-yan-pencere flex flex-col gap-4 overflow-y-auto border-kenar bg-zemin p-6 text-yazi shadow-pencere",
          taraflar[taraf],
          className,
        )}
        {...ozellikler}
      >
        {children}
        <Dialog.Close asChild>
          <IkonDugmesi ikon="kapat" etiket={kapatEtiketi} className="absolute top-2 right-2" />
        </Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  );
}
