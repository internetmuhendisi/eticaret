"use client";
// Pencerede kaydedilmemiş değişiklik varken kapatmadan önce sormak (kartlar 0142 ve 0143, .claude/rules/formlar.md).
// Formun "değişti" bilgisi çizimi beklemeden tutulur (ref): form değişir değişmez basılan Escape de sorar (yük
// altında durum bir sonraki çizime kalınca pencere sormadan kapanıyordu, ölçüldü). Soru pencerenin içinde, formun
// üstünde durur: "Değişiklikleri bırak" kapatır, "Düzenlemeye dön" soruyu kaldırır.
import { type ReactNode, useRef, useState } from "react";
import { Dugme } from "../../bilesenler/parcalar/dugme";
import { Uyari } from "../../bilesenler/parcalar/uyari";
import { usePanelMetni } from "../metinler/panel-metni";

export const useKapatmaSorusu = (kapatIs: () => void) => {
  const metin = usePanelMetni();
  const kirli = useRef(false);
  const [soruluyor, setSoruluyor] = useState(false);
  const kapat = () => {
    kirli.current = false;
    setSoruluyor(false);
    kapatIs();
  };
  const kapatmayiIste = () => (kirli.current ? setSoruluyor(true) : kapat());
  const degisince = (degisti: boolean) => {
    kirli.current = degisti;
  };
  const soru: ReactNode = soruluyor ? (
    <Uyari tur="uyari">
      <span className="flex flex-col items-start gap-2">
        {metin("yonetim.bolumler.form.kaydedilmedi")}
        <span className="flex flex-wrap gap-2">
          <Dugme tur="cerceveli" onClick={kapat}>
            {metin("yonetim.bolumler.form.birak")}
          </Dugme>
          <Dugme tur="sade" autoFocus onClick={() => setSoruluyor(false)}>
            {metin("yonetim.bolumler.form.don")}
          </Dugme>
        </span>
      </span>
    </Uyari>
  ) : null;
  return { kapat, kapatmayiIste, degisince, soru };
};
