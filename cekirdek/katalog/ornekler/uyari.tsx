"use client";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import { useOrnekMetni } from "./ortak";

export function UyariOrnegi() {
  const m = useOrnekMetni();
  return (
    <>
      <Uyari tur="tehlike" baslik={m("uyariBasligi")}>
        {m("tehlikeUyari")}
      </Uyari>
      <Uyari tur="uyari">{m("uyariUyari")}</Uyari>
      <Uyari tur="basari">{m("basariUyari")}</Uyari>
      <Uyari tur="bilgi">{m("bilgiUyari")}</Uyari>
    </>
  );
}
