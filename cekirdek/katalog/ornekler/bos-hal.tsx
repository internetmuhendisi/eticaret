"use client";
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { BosHal } from "../../../bilesenler/parcalar/bos-hal";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import { useOrnekMetni } from "./ortak";

export function BosHalOrnegi() {
  const m = useOrnekMetni();
  return (
    <div className="flex flex-col gap-6">
      <BosHal ikon="arama" baslik={m("bosBaslik")} aciklama={m("bosAciklama")} duzey={3}>
        <Dugme tur="cerceveli">{m("filtreleriTemizle")}</Dugme>
      </BosHal>
      <BosHal
        ikon="favori"
        baslik={m("favoriBosBaslik")}
        aciklama={m("favoriBosAciklama")}
        duzey={3}
      >
        <Baglanti href="/" gorunum="birincil">
          {m("alisveriseBasla")}
        </Baglanti>
      </BosHal>
    </div>
  );
}
