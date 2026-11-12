"use client";
import { SayfaBasligi } from "../../../bilesenler/parcalar/sayfa-basligi";
import { useOrnekMetni } from "./ortak";

// Vitrinde parça sayfanın h1'idir; üçüncü örnek panelin görünümüdür (kart 0141). Katalog sayfasının kendi h1'i olduğu için örnekler h2 düzeyindedir.
export function SayfaBasligiOrnegi() {
  const m = useOrnekMetni();
  return (
    <div className="flex flex-col gap-6">
      <SayfaBasligi baslik={m("baslikGiyim")} ek={m("urunSayisi")} duzey={2} />
      <SayfaBasligi baslik={m("uzunBaslik")} duzey={2} />
      <SayfaBasligi baslik={m("baslikGiyim")} duzey={2} gorunum="panel" />
    </div>
  );
}
