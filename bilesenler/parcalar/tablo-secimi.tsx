"use client";
// Tablo satırını seçen onay kutusu (kart 0258): görünen kutu küçük, basılan alan 44 px. Ekran okuyucudaki adı
// "etiket"tir (görünür yazısı yoktur, satırın kendisi adlandırır). "kismen" sayfadaki satırların bir kısmı seçiliyken
// başlıktaki kutunun hâlidir (aria-checked="mixed"); ona basılınca seçim bırakılır.
import { Checkbox } from "radix-ui";
import { Ikon } from "../ikonlar/ikon.tsx";
import { sinif } from "./sinif.ts";

export function TabloSecimi({
  etiket,
  isaretli,
  degisince,
  className,
}: {
  etiket: string;
  isaretli: boolean | "kismen";
  degisince: (isaretli: boolean) => void;
  className?: string;
}) {
  const dolu = isaretli !== false;
  return (
    <Checkbox.Root
      data-slot="tablo-secimi"
      aria-label={etiket}
      checked={isaretli === "kismen" ? "indeterminate" : isaretli}
      // Kısmen seçiliyken basılınca hepsi bırakılır (taslak: "Seçimi kaldır" ile aynı).
      onCheckedChange={(deger) => degisince(isaretli === "kismen" ? false : deger === true)}
      className={sinif(
        "inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-kucuk",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={sinif(
          "flex size-5 items-center justify-center rounded-kucuk border border-alan-kenari bg-zemin text-zemin",
          dolu && "border-yazi bg-yazi",
        )}
      >
        {isaretli === "kismen" ? <Ikon ad="kismen-secili" /> : dolu ? <Ikon ad="onay" /> : null}
      </span>
    </Checkbox.Root>
  );
}
