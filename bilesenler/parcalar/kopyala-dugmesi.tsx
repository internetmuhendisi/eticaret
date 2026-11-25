"use client";
// Bir değeri panoya kopyalayan düğme (kart 0275; ilk kullanımı kart 0214'ün IBAN düğmesi). Sonuç bildirim alanında
// söylenir; pano kullanılamazsa (izin, eski tarayıcı) değerin elle seçilebileceğini söyleyen metin gösterilir.
// Metinler kullanandan gelir.
import type { ComponentProps } from "react";
import { Ikon } from "../ikonlar/ikon";
import { bildirimGoster } from "./bildirim";
import { Dugme } from "./dugme";

export function KopyalaDugmesi({
  deger,
  etiket,
  kopyalandiMetni,
  kopyalanamadiMetni,
  tur = "cerceveli",
  ...ozellikler
}: {
  deger: string;
  // Düğmenin görünen yazısı; ekran okuyucu adı gerekiyorsa aria-label ile verilir.
  etiket: string;
  kopyalandiMetni: string;
  kopyalanamadiMetni: string;
} & Omit<ComponentProps<typeof Dugme>, "children" | "onClick">) {
  return (
    <Dugme
      tur={tur}
      {...ozellikler}
      onClick={() => {
        void navigator.clipboard
          .writeText(deger)
          .then(() => bildirimGoster("basari", kopyalandiMetni))
          .catch(() => bildirimGoster("tehlike", kopyalanamadiMetni));
      }}
    >
      <Ikon ad="kopyala" />
      {etiket}
    </Dugme>
  );
}
