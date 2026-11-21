"use client";
// Tablo seçimi örneği (kart 0258): seçilmemiş, seçili ve bir kısmı seçili hâller.
import { useState } from "react";
import { TabloSecimi } from "../../../bilesenler/parcalar/tablo-secimi";
import { useOrnekMetni } from "./ortak";

export function TabloSecimiOrnegi() {
  const m = useOrnekMetni();
  const [bos, setBos] = useState(false);
  const [isaretli, setIsaretli] = useState(true);
  const [kismen, setKismen] = useState<boolean | "kismen">("kismen");
  return (
    <div className="flex flex-wrap gap-2">
      <TabloSecimi etiket={m("tablo.bos")} isaretli={bos} degisince={setBos} />
      <TabloSecimi etiket={m("tablo.isaretli")} isaretli={isaretli} degisince={setIsaretli} />
      <TabloSecimi etiket={m("tablo.kismen")} isaretli={kismen} degisince={setKismen} />
    </div>
  );
}
