"use client";
import { useState } from "react";
import { SecenekGrubu } from "../../../bilesenler/parcalar/secenek-grubu";
import { doldur } from "../../moduller/eposta/sablon";
import { useOrnekMetni } from "./ortak";

// Beden adları kod ve ölçüdür, metin değildir.
const bedenler = [
  { deger: "s", ad: "S" },
  { deger: "m", ad: "M", secilemez: true },
  { deger: "l", ad: "L" },
  { deger: "xl", ad: "XL" },
];

export function SecenekGrubuOrnegi() {
  const m = useOrnekMetni();
  const [secili, setSecili] = useState<string | undefined>("s");
  const ad = bedenler.find((beden) => beden.deger === secili)?.ad ?? "";
  return (
    <SecenekGrubu
      baslik={doldur(m("bedenBasligi"), { deger: ad })}
      etiket={m("beden")}
      ogeler={bedenler}
      deger={secili}
      onDegerDegisti={setSecili}
      secilemezEki={m("tukendiEki")}
      aciklama={m("bedenAciklamasi")}
    />
  );
}
