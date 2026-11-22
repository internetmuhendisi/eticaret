"use client";
import { IlerlemeCubugu } from "../../../bilesenler/parcalar/ilerleme-cubugu";
import { useOrnekMetni } from "./ortak";

// Üç oran: başlangıç, yarım ve tam.
export function IlerlemeCubuguOrnegi() {
  const m = useOrnekMetni();
  return (
    <div className="flex max-w-metin flex-col gap-4">
      <IlerlemeCubugu oran={0} etiket={m("ilerlemeBos")} />
      <IlerlemeCubugu oran={0.5} etiket={m("ilerlemeYarim")} />
      <IlerlemeCubugu oran={1} etiket={m("ilerlemeTam")} />
    </div>
  );
}
