"use client";
// Bildirim alanı katalogun düzenindedir (app/gelistirme/bilesenler/layout.tsx); burada yalnız gösterilir.
import { BildirimAlani, bildirimGoster } from "../../../bilesenler/parcalar/bildirim";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import { useMetin } from "../../metinler/istemci-metni";
import { useOrnekMetni } from "./ortak";

export function BildirimOrnegi() {
  const m = useOrnekMetni();
  return (
    <div className="flex flex-wrap gap-2">
      <Dugme tur="cerceveli" onClick={() => bildirimGoster("basari", m("bildirimMetni"))}>
        {m("bildirimGoster")}
      </Dugme>
      <Dugme tur="cerceveli" onClick={() => bildirimGoster("tehlike", m("hataBildirimMetni"))}>
        {m("hataBildirimiGoster")}
      </Dugme>
    </div>
  );
}

export function KatalogBildirimAlani() {
  const metin = useMetin();
  return (
    <BildirimAlani
      alanEtiketi={metin("ortak.parca.bildirimler")}
      kapatEtiketi={metin("ortak.parca.bildirimiKapat")}
    />
  );
}
