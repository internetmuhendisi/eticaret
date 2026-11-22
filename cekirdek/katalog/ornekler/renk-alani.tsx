"use client";
import { useState } from "react";
import { FormAlani } from "../../../bilesenler/form/form-alani";
import { RenkAlani } from "../../../bilesenler/parcalar/renk-alani";
import { varsayilanTemaDegerleri } from "../../../bilesenler/tasarim-degerleri/degerler";
import { useOrnekMetni } from "./ortak";

export function RenkAlaniOrnegi() {
  const m = useOrnekMetni();
  const [renk, setRenk] = useState(varsayilanTemaDegerleri.renkler.acik.birincil);
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
