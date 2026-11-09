"use client";
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { katalogAdresi } from "../kayit";
import { useOrnekMetni } from "./ortak";

export function BaglantiOrnegi() {
  const m = useOrnekMetni();
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Baglanti href={`${katalogAdresi}/baglanti`}>{m("baglantiMetni")}</Baglanti>
      <Baglanti href={`${katalogAdresi}/baglanti`} gorunum="birincil">
        {m("baglantiDugme")}
      </Baglanti>
    </div>
  );
}
