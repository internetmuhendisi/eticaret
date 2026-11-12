"use client";
// Anlık bildirim (kart 0103; shadcn/ui sonner). "Kaydedildi", "Hata oluştu" gibi bildirimler yalnız
// buradan gösterilir (.claude/rules/bilesenler.md). Bildirim alanı sayfada bir kez durur; bildirim
// bildirimGoster ile açılır; isteğe bağlı bir eylem düğmesi taşır ("Geri al"). Ekran okuyucu bildirimi okur. Metinleri kullanan sayfa verir; Sonner'ın kendi
// renkleri kapalıdır (unstyled), görünüş tasarım değerlerindendir. Alan body'nin ayrı bir çocuğu olarak
// çizilir ve dışarıda kalır işaretini taşır: pencere açıkken etkisiz kılınmaz, pencereden verilen bildirim
// de okunur ve kapatılabilir (kart 0103, ölçüldü).
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Toaster, toast } from "sonner";
import { Ikon } from "../ikonlar/ikon.tsx";
import { disaridaKalirIsareti } from "./disariyi-kapat.ts";
import { sinif } from "./sinif.ts";
import type { UyariTuru } from "./uyari.tsx";

const turSiniflari: Record<UyariTuru, string> = {
  tehlike: "border-tehlike bg-tehlike-zemin text-tehlike-yazi",
  uyari: "border-uyari bg-uyari-zemin text-uyari-yazi",
  basari: "border-basari bg-basari-zemin text-basari-yazi",
  bilgi: "border-kenar bg-zemin text-yazi",
};

export function BildirimAlani({
  alanEtiketi,
  kapatEtiketi,
}: {
  // Ekran okuyucunun bildirim alanına verdiği ad, örneğin "Bildirimler".
  alanEtiketi: string;
  // Her bildirimin kapat düğmesinin adı.
  kapatEtiketi: string;
}) {
  // Sunucuda body yoktur; alan sayfa tarayıcıda açılınca çizilir.
  const [hazir, setHazir] = useState(false);
  useEffect(() => setHazir(true), []);
  if (!hazir) return null;
  return createPortal(
    // Pencere açıkken Radix sayfanın tamamında tıklamayı kapatır; bildirim tıklamaya açık kalır.
    <div
      {...{ [disaridaKalirIsareti]: "" }}
      data-slot="bildirim-alani"
      className="pointer-events-auto"
    >
      <Toaster
        position="bottom-right"
        containerAriaLabel={alanEtiketi}
        customAriaLabel={alanEtiketi}
        closeButton
        icons={{
          success: <Ikon ad="basari" />,
          info: <Ikon ad="bilgi" />,
          warning: <Ikon ad="uyari" />,
          error: <Ikon ad="hata" />,
          loading: <Ikon ad="yukleniyor" className="animate-don" />,
          close: <Ikon ad="kapat" />,
        }}
        toastOptions={{
          unstyled: true,
          closeButtonAriaLabel: kapatEtiketi,
          classNames: {
            toast:
              "relative flex w-full items-start gap-3 rounded-orta border-2 p-4 pr-12 font-govde text-govde shadow-acilir",
            title: "font-kalin",
            // Eylem düğmesi yazının altında, bildirimin kendi renginde kenarlı bir düğmedir.
            actionButton:
              "mt-2 inline-flex min-h-11 cursor-pointer items-center rounded-dugme border border-current px-4 font-en-kalin hover:bg-kenar",
            icon: "mt-0.5",
            closeButton:
              "absolute top-1 right-1 flex size-11 cursor-pointer items-center justify-center rounded-dugme text-current hover:bg-kenar",
            ...Object.fromEntries(
              (["tehlike", "uyari", "basari", "bilgi"] as const).map((tur) => [
                { tehlike: "error", uyari: "warning", basari: "success", bilgi: "info" }[tur],
                turSiniflari[tur],
              ]),
            ),
          },
        }}
      />
    </div>,
    document.body,
  );
}

// Bildirimin isteğe bağlı eylemi, örneğin "Geri al" (kart 0140). Düğme bildirimin içinde durur, basılınca
// bildirim kapanır. Eylemli bildirim daha uzun (eylemliSure) açık kalır; üzerine gelince ya da klavyeyle
// bildirim alanına geçince (Alt+T) süre durur.
const eylemliSure = 10_000;
export type BildirimEylemi = { etiket: string; tikla: () => void };

export function bildirimGoster(tur: UyariTuru, metin: string, eylem?: BildirimEylemi): void {
  const goster = {
    tehlike: toast.error,
    uyari: toast.warning,
    basari: toast.success,
    bilgi: toast.info,
  }[tur];
  goster(metin, {
    className: sinif(turSiniflari[tur]),
    ...(eylem === undefined
      ? {}
      : { action: { label: eylem.etiket, onClick: eylem.tikla }, duration: eylemliSure }),
  });
}
