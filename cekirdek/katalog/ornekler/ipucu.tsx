"use client";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import { Ipucu } from "../../../bilesenler/parcalar/ipucu";
import { useOrnekMetni } from "./ortak";

export function IpucuOrnegi() {
  const m = useOrnekMetni();
  return (
    <div>
      <Ipucu metin={m("kargoIpucu")}>
        <Dugme tur="sade">{m("kargoHakkinda")}</Dugme>
      </Ipucu>
    </div>
  );
}
