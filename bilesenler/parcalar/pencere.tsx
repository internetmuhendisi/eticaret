"use client";
// Pencere (kart 0103; shadcn/ui dialog). Açılınca odak pencerenin içine girer ve orada kalır, Escape ya
// da kapat düğmesiyle kapanır, odak açan öğeye döner. Telefonda tam ekran açılır, tablette ve
// bilgisayarda ortada durur (.claude/rules/telefon-gorunumu.md). Genişliği standart üç genişlikten
// biridir (.claude/rules/yonetim-paneli.md). Başlığı zorunludur; metinleri kullanan sayfa verir.
// Silme ve iptal gibi geri dönüşsüz eylemlerin onayı da bu pencereyle sorulur.
import { Dialog } from "radix-ui";
import type { ComponentProps, HTMLAttributes } from "react";
import { disaridaKalanaTiklama, disariyiKapatanRef } from "./disariyi-kapat.ts";
import { IkonDugmesi } from "./dugme.tsx";
import { sinif } from "./sinif.ts";

export const Pencere = Dialog.Root;
export const PencereTetikleyici = Dialog.Trigger;
export const PencereKapat = Dialog.Close;

export const ortuSiniflari =
  "fixed inset-0 z-pencere bg-ortu/60 acik:animate-ortu-belir kapali:animate-ortu-kaybol";

const genislikler = {
  kucuk: "tablet:max-w-form",
  orta: "tablet:max-w-metin",
  genis: "tablet:max-w-icerik",
} as const;

export function PencereIcerigi({
  ref,
  onInteractOutside,
  className,
  children,
  kapatEtiketi,
  genislik = "kucuk",
  ...ozellikler
}: ComponentProps<typeof Dialog.Content> & {
  // Kapat düğmesinin ekran okuyucudaki ve ipucundaki adı.
  kapatEtiketi: string;
  genislik?: keyof typeof genislikler;
}) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay data-slot="pencere-ortusu" className={ortuSiniflari} />
      <Dialog.Content
        data-slot="pencere-icerigi"
        ref={disariyiKapatanRef(ref)}
        onInteractOutside={(olay) => {
          disaridaKalanaTiklama(olay);
          onInteractOutside?.(olay);
        }}
        className={sinif(
          "fixed inset-0 z-pencere flex flex-col gap-4 overflow-y-auto bg-zemin p-6 text-yazi acik:animate-belir kapali:animate-kaybol",
          "tablet:inset-auto tablet:top-1/2 tablet:left-1/2 tablet:max-h-full tablet:w-full tablet:-translate-x-1/2 tablet:-translate-y-1/2 tablet:rounded-orta tablet:border tablet:border-kenar tablet:shadow-pencere",
          genislikler[genislik],
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

export function PencereUstu({ className, ...ozellikler }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="pencere-ustu"
      className={sinif("flex flex-col gap-2 pr-10", className)}
      {...ozellikler}
    />
  );
}

export function PencereAlti({ className, ...ozellikler }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="pencere-alti"
      className={sinif(
        "mt-auto flex flex-col-reverse gap-2 tablet:flex-row tablet:justify-end",
        className,
      )}
      {...ozellikler}
    />
  );
}

export function PencereBasligi({ className, ...ozellikler }: ComponentProps<typeof Dialog.Title>) {
  return (
    <Dialog.Title
      data-slot="pencere-basligi"
      className={sinif("font-baslik text-baslik-4 font-baslik-kalinligi", className)}
      {...ozellikler}
    />
  );
}

export function PencereAciklamasi({
  className,
  ...ozellikler
}: ComponentProps<typeof Dialog.Description>) {
  return (
    <Dialog.Description
      data-slot="pencere-aciklamasi"
      className={sinif("text-soluk-yazi", className)}
      {...ozellikler}
    />
  );
}
