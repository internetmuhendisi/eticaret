"use client";
// Panelden çıkış (kart 0027). Çıkınca sayfa baştan yüklenir: tarayıcıda panel kalmaz.
import { useState } from "react";
import { Dugme } from "../../bilesenler/form/dugme";
import { Uyari } from "../../bilesenler/form/uyari";
import { useMetin } from "../metinler/istemci-metni";
import { girisAdresi } from "./adresler";

const cikisUcu = "/kapi/herkese-acik/yonetici-cikis";

export function CikisDugmesi() {
  const metin = useMetin();
  const [hata, setHata] = useState(false);

  const cik = async () => {
    setHata(false);
    try {
      const yanit = await fetch(cikisUcu, { method: "POST" });
      if (yanit.ok) {
        window.location.assign(girisAdresi);
        return;
      }
    } catch {
      // Aşağıdaki uyarı gösterilir.
    }
    setHata(true);
  };

  return (
    <>
      {hata ? <Uyari>{metin("yonetim.cikis.hata")}</Uyari> : null}
      <Dugme onClick={cik}>{metin("yonetim.cikis.dugme")}</Dugme>
    </>
  );
}
