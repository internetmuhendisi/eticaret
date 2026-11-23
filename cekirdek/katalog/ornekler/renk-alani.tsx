"use client";
import { useEffect, useState } from "react";
import { FormAlani } from "../../../bilesenler/form/form-alani";
import { RenkAlani } from "../../../bilesenler/parcalar/renk-alani";
import { degiskenAdi } from "../../../bilesenler/tasarim-degerleri/degisken-adlari";
import { useOrnekMetni } from "./ortak";

export function RenkAlaniOrnegi() {
  const m = useOrnekMetni();
  // Başlangıç rengi sayfadaki ana renktir. Tema değerleri tablosu tarayıcı kodunda içe aktarılmaz: derleyici ortak
  // modülün tarayıcıda kullanılan her parçasını vitrine de koyuyordu (kart 0295, cekirdek/testler/vitrin-kodu.test.ts).
  const [renk, setRenk] = useState("");
  useEffect(() => {
    setRenk(
      getComputedStyle(document.documentElement)
        .getPropertyValue(degiskenAdi.renk("birincil"))
        .trim(),
    );
  }, []);
  const [hatali, setHatali] = useState("");
  return (
    <>
      <FormAlani etiket={m("renkEtiketi")} aciklama={m("renkAciklama")}>
        {(alan) => (
          <RenkAlani
            {...alan}
            name="renk"
            value={renk}
            onDegerDegisti={setRenk}
            seciciEtiketi={m("renkSecici")}
          />
        )}
      </FormAlani>
      <FormAlani etiket={m("renkIkinci")} hata={m("renkHata")}>
        {(alan) => (
          <RenkAlani
            {...alan}
            name="renk-hatali"
            value={hatali}
            onDegerDegisti={setHatali}
            seciciEtiketi={m("renkIkinciSecici")}
          />
        )}
      </FormAlani>
    </>
  );
}
