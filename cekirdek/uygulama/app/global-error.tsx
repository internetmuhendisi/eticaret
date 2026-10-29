"use client";
// Kök düzenin kendisi bozulursa gösterilen ekran (kart 0014). Kök düzen yokken sitenin dili
// bilinmez; ayar şemasının varsayılan dili kullanılır.
import { useEffect } from "react";
import { ayarSemasi } from "../../ayar-semasi/ayarlar";
import { istemciHatasiniKaydet } from "../../izleme/istemci-hata-katmani";
import { metinOkuyucu } from "../../metinler/metin";

const varsayilanDil = ayarSemasi.shape.dil.parse(undefined);
const metin = metinOkuyucu(varsayilanDil);

export default function KokHatasi({ error }: { error: unknown }) {
  useEffect(() => istemciHatasiniKaydet(error), [error]);
  return (
    <html lang={varsayilanDil}>
      <body>
        <main>
          <p role="alert">{metin("ortak.hata.sayfaGosterilemiyor")}</p>
        </main>
      </body>
    </html>
  );
}
