"use client";
// Kurulum ekranının akışı (kart 0028): önce karekod ve ilk kod, onaydan sonra bir kez gösterilen yedek
// kodlar. Karekodu sunucu çizer ve hazır verir; gizli tarayıcıda üretilmez.
import { type ReactNode, useState } from "react";
import { Dugme } from "../../bilesenler/parcalar/dugme";
import { usePanelMetni } from "../metinler/panel-metni";
import { KodFormu } from "./kod-formu";
import { stil } from "./stil";

export function KurulumAkisi({ donus, hazirlik }: { donus: string; hazirlik: ReactNode }) {
  const metin = usePanelMetni();
  const [yedekKodlari, setYedekKodlari] = useState<string[] | null>(null);

  if (yedekKodlari === null) {
    return (
      <>
        {hazirlik}
        <p>{metin("yonetim.kurulum.adim3")}</p>
        <KodFormu<{ yedekKodlari: string[] }>
          uc="/kapi/herkese-acik/yonetici-kurulum-onay"
          etiket={metin("yonetim.kurulum.alan")}
          dugme={metin("yonetim.kurulum.gonder")}
          basarili={(veri) => setYedekKodlari(veri.yedekKodlari)}
        />
      </>
    );
  }
  return (
    <>
      <h2>{metin("yonetim.kurulum.yedekBaslik")}</h2>
      <p>{metin("yonetim.kurulum.yedekAciklama")}</p>
      <ul className={stil.yedekKodlar}>
        {yedekKodlari.map((kod) => (
          <li key={kod}>{kod}</li>
        ))}
      </ul>
      <Dugme type="button" onClick={() => window.location.assign(donus)}>
        {metin("yonetim.kurulum.devam")}
      </Dugme>
    </>
  );
}
