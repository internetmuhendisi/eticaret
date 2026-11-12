"use client";
// Panelden çıkış (kart 0027). Çıkınca sayfa baştan yüklenir: tarayıcıda panel kalmaz. Adı ve ikonu eylem
// kaydından gelir (kart 0141).
import { useState } from "react";
import { Uyari } from "../../bilesenler/parcalar/uyari";
import { useMetin } from "../metinler/istemci-metni";
import { girisAdresi } from "./adresler";
import { EylemDugmesi } from "./eylem-dugmesi";

const cikisUcu = "/kapi/herkese-acik/yonetici-cikis";

export function CikisDugmesi({ className }: { className?: string }) {
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
      {hata ? <Uyari tur="tehlike">{metin("yonetim.cikis.hata")}</Uyari> : null}
      <EylemDugmesi
        eylem="cikis"
        onClick={cik}
        {...(className === undefined ? {} : { className })}
      />
    </>
  );
}
