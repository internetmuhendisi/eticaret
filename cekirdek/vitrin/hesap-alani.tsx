"use client";
// Vitrinde müşterinin hesap alanı (kart 0033), sade ana sayfada. Oturumu sorma ve çıkış ortaktır
// (hesap-durumu.ts, kart 0131). Cevap gelene kadar boş kalır: girişli müşteri bir an "Giriş yap" görmesin.
import { useState } from "react";
import { Baglanti } from "../../bilesenler/parcalar/baglanti";
import { Dugme } from "../../bilesenler/parcalar/dugme";
import { Uyari } from "../../bilesenler/parcalar/uyari";
import { useMetin } from "../metinler/istemci-metni";
import { vitrinAdresleri } from "./adresler";
import { cikisYap, useHesapDurumu } from "./hesap-durumu";
import { stil } from "./stil";

export function HesapAlani() {
  const metin = useMetin();
  const durum = useHesapDurumu();
  const [cikisHatasi, setCikisHatasi] = useState(false);

  const cik = async () => {
    setCikisHatasi(false);
    if (!(await cikisYap())) setCikisHatasi(true);
  };

  if (durum.tur === "bilinmiyor") return null;
  return (
    <nav className={stil.hesapAlani}>
      {durum.tur === "girissiz" ? (
        <>
          <Baglanti href={vitrinAdresleri.giris}>{metin("vitrin.hesap.giris")}</Baglanti>
          <Baglanti href={vitrinAdresleri.kayit}>{metin("vitrin.hesap.kayit")}</Baglanti>
        </>
      ) : (
        <>
          {cikisHatasi ? <Uyari tur="tehlike">{metin("vitrin.hesap.cikisHata")}</Uyari> : null}
          <span className={stil.eposta}>{durum.eposta}</span>
          <Dugme onClick={cik}>{metin("vitrin.hesap.cikis")}</Dugme>
        </>
      )}
    </nav>
  );
}
