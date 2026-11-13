"use client";
// Onay penceresi (kart 0143, .claude/rules/bilesenler.md): silme ve iptal gibi geri dönüşsüz eylemler yalnız bununla
// sorulur. Radix'in uyarı penceresidir (alertdialog): ekran okuyucu onu uyarı olarak duyurur, dışarıya tıklamak
// kapatmaz, Escape vazgeçer, açılınca odak "Vazgeç"tedir (yanlışlıkla Enter'a basmak silmesin), kapanınca odak
// açan öğeye döner. Onay sürerken iki düğme de kapalıdır; onay bitince pencere kapanır. Görünüşü pencereyle aynıdır.
// Metinleri kullanan sayfa verir.
import { AlertDialog } from "radix-ui";
import { useLayoutEffect, useRef, useState } from "react";
import { type DugmeTuru, dugmeSiniflari } from "./dugme.tsx";
import { ortuSiniflari } from "./pencere.tsx";
import { sinif } from "./sinif.ts";

export function OnayPenceresi({
  acik,
  acikDegisince,
  baslik,
  aciklama,
  onayEtiketi,
  vazgecEtiketi,
  onayla,
  tur = "tehlike",
}: {
  acik: boolean;
  acikDegisince: (acik: boolean) => void;
  baslik: string;
  aciklama: string;
  // Onay düğmesinin yazısı eylemi söyler: "Sil", "Menüyü sil".
  onayEtiketi: string;
  vazgecEtiketi: string;
  // Onay işi; bitince pencere kapanır.
  onayla: () => void | Promise<void>;
  // Onay düğmesinin türü: geri dönüşsüz eylem tehlike rengindedir.
  tur?: Extract<DugmeTuru, "tehlike" | "birincil">;
}) {
  const [suruyor, setSuruyor] = useState(false);
  // Pencere tetikleyicisiz açılır (kullanan durumu verir): açılmadan önceki odak saklanır, kapanınca oraya döner.
  // Radix odağı pencereye kendi etkisinde taşır; bu düzen etkisi ondan önce çalışır. Odaklanan öğe artık sayfada
  // değilse (silinen satırın menüsü) odağı kullanan yerleştirir.
  const onceki = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (acik && document.activeElement instanceof HTMLElement)
      onceki.current = document.activeElement;
  }, [acik]);
  return (
    <AlertDialog.Root
      open={acik}
      onOpenChange={(yeni) => (suruyor ? undefined : acikDegisince(yeni))}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay data-slot="onay-penceresi-ortusu" className={ortuSiniflari} />
        <AlertDialog.Content
          data-slot="onay-penceresi"
          onCloseAutoFocus={(olay) => {
            olay.preventDefault();
            if (onceki.current?.isConnected === true) onceki.current.focus();
          }}
          className={sinif(
            "fixed inset-x-0 bottom-0 z-pencere flex flex-col gap-4 bg-zemin p-6 text-yazi acik:animate-belir kapali:animate-kaybol",
            "tablet:inset-auto tablet:top-1/2 tablet:left-1/2 tablet:w-full tablet:max-w-form tablet:-translate-x-1/2 tablet:-translate-y-1/2 tablet:rounded-orta tablet:border tablet:border-kenar tablet:shadow-pencere",
          )}
        >
          <AlertDialog.Title className="font-baslik text-baslik-4 font-baslik-kalinligi">
            {baslik}
          </AlertDialog.Title>
          <AlertDialog.Description className="text-soluk-yazi">{aciklama}</AlertDialog.Description>
          <div className="flex flex-col-reverse gap-2 tablet:flex-row tablet:justify-end">
            <AlertDialog.Cancel className={dugmeSiniflari({ tur: "cerceveli" })} disabled={suruyor}>
              {vazgecEtiketi}
            </AlertDialog.Cancel>
            <AlertDialog.Action
              className={dugmeSiniflari({ tur })}
              disabled={suruyor}
              onClick={async (olay) => {
                // Pencere iş bitince kapanır: Radix'in hemen kapatması engellenir.
                olay.preventDefault();
                setSuruyor(true);
                try {
                  await onayla();
                } finally {
                  setSuruyor(false);
                  acikDegisince(false);
                }
              }}
            >
              {onayEtiketi}
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
