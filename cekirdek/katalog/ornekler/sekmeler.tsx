"use client";
import { Sekme, SekmeIcerigi, SekmeListesi, Sekmeler } from "../../../bilesenler/parcalar/sekmeler";
import { useOrnekMetni } from "./ortak";

export function SekmelerOrnegi() {
  const m = useOrnekMetni();
  return (
    <Sekmeler defaultValue="aciklama">
      <SekmeListesi>
        <Sekme value="aciklama">{m("aciklamaSekmesi")}</Sekme>
        <Sekme value="ozellikler">{m("ozelliklerSekmesi")}</Sekme>
        <Sekme value="yorumlar">{m("yorumlarSekmesi")}</Sekme>
      </SekmeListesi>
      <SekmeIcerigi value="aciklama">{m("aciklamaIcerigi")}</SekmeIcerigi>
      <SekmeIcerigi value="ozellikler">{m("ozelliklerIcerigi")}</SekmeIcerigi>
      <SekmeIcerigi value="yorumlar">{m("yorumlarIcerigi")}</SekmeIcerigi>
    </Sekmeler>
  );
}
