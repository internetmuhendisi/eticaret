"use client";
import { Rozet } from "../../../bilesenler/parcalar/rozet";
import { useOrnekMetni } from "./ortak";

export function RozetOrnegi() {
  const m = useOrnekMetni();
  return (
    <div className="flex flex-wrap gap-2">
      <Rozet>{m("yeni")}</Rozet>
      <Rozet tur="ikincil">{m("kargoBedava")}</Rozet>
      <Rozet tur="cerceveli">{m("cerceveliRozet")}</Rozet>
      <Rozet tur="tehlike">{m("tukendi")}</Rozet>
      <Rozet tur="basari">{m("stokta")}</Rozet>
      <Rozet tur="uyari">{m("sonUrunler")}</Rozet>
    </div>
  );
}
