"use client";
import { useState } from "react";
import { Dugme, IkonDugmesi } from "../../../bilesenler/parcalar/dugme";
import { useOrnekMetni } from "./ortak";

export function DugmeOrnegi() {
  const m = useOrnekMetni();
  const [basildi, setBasildi] = useState(false);
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Dugme onClick={() => setBasildi(true)}>{m("birincil")}</Dugme>
        <Dugme tur="ikincil">{m("ikincil")}</Dugme>
        <Dugme tur="cerceveli">{m("cerceveli")}</Dugme>
        <Dugme tur="sade">{m("sade")}</Dugme>
        <Dugme tur="tehlike">{m("tehlike")}</Dugme>
        <Dugme tur="baglanti">{m("baglantiGorunumlu")}</Dugme>
        <Dugme disabled>{m("kapali")}</Dugme>
        <IkonDugmesi ikon="bilgi" etiket={m("ikonDugmesi")} tur="cerceveli" />
      </div>
      {basildi ? <p role="status">{m("basildi")}</p> : null}
    </>
  );
}
