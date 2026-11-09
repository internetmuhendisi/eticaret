"use client";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import {
  Kart,
  KartAciklamasi,
  KartAlti,
  KartBasligi,
  KartIcerigi,
  KartUstu,
} from "../../../bilesenler/parcalar/kart";
import { Rozet } from "../../../bilesenler/parcalar/rozet";
import { useOrnekMetni } from "./ortak";

export function KartOrnegi() {
  const m = useOrnekMetni();
  return (
    <Kart>
      <KartUstu>
        <KartBasligi duzey={3}>{m("kartBasligi")}</KartBasligi>
        <Rozet tur="basari">{m("stokta")}</Rozet>
      </KartUstu>
      <KartAciklamasi>{m("kartAciklamasi")}</KartAciklamasi>
      <KartIcerigi>{m("kartIcerigi")}</KartIcerigi>
      <KartAlti>
        <Dugme>{m("birincil")}</Dugme>
      </KartAlti>
    </Kart>
  );
}
