"use client";
import { OnayKutusu } from "../../../bilesenler/parcalar/onay-kutusu";
import { useOrnekMetni } from "./ortak";

export function OnayKutusuOrnegi() {
  const m = useOrnekMetni();
  return (
    <>
      <OnayKutusu name="kampanya" etiket={m("onay")} />
      <OnayKutusu name="faturaEposta" etiket={m("faturaEposta")} defaultChecked />
    </>
  );
}
