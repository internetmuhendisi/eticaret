"use client";
import {
  Akordeon,
  AkordeonBasligi,
  AkordeonIcerigi,
  AkordeonOgesi,
} from "../../../bilesenler/parcalar/akordeon";
import { useOrnekMetni } from "./ortak";

export function AkordeonOrnegi() {
  const m = useOrnekMetni();
  return (
    <Akordeon type="single" collapsible>
      {(["Bir", "Iki", "Uc"] as const).map((sira) => (
        <AkordeonOgesi key={sira} value={sira}>
          <AkordeonBasligi duzey={3}>{m(`soru${sira}`)}</AkordeonBasligi>
          <AkordeonIcerigi>{m(`cevap${sira}`)}</AkordeonIcerigi>
        </AkordeonOgesi>
      ))}
    </Akordeon>
  );
}
