"use client";
import { SekmeBaglantilari } from "../../../bilesenler/parcalar/sekme-baglantilari";
import { useOrnekMetni } from "./ortak";

export function SekmeBaglantilariOrnegi() {
  const m = useOrnekMetni();
  return (
    <SekmeBaglantilari
      etiket={m("sekmeBaglantilari")}
      secili="birinci"
      sekmeler={[
        { kod: "birinci", ad: m("sekmeBirinci"), adres: "#birinci", sayi: 12 },
        { kod: "ikinci", ad: m("sekmeIkinci"), adres: "#ikinci", sayi: 3 },
        { kod: "ucuncu", ad: m("sekmeUcuncu"), adres: "#ucuncu" },
      ]}
    />
  );
}
