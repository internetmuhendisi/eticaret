"use client";
// Kök düzenin kendisi bozulursa gösterilen ekran (kart 0014). Kök düzen yokken sitenin dili
// bilinmez; dil ayarının varsayılanı kullanılır. Ayar şeması içe aktarılmaz: bu ekran her sayfayla tarayıcıya
// gider, şema zod'u ve bütün şemaları taşırdı (kart 0146).
import { useEffect } from "react";
import { istemciHatasiniKaydet } from "../../izleme/istemci-hata-katmani";
import { metinOkuyucu, varsayilanDil } from "../../metinler/metin";

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
