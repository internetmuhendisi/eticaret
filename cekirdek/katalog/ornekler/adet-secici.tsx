"use client";
import { useState } from "react";
import { AdetSecici } from "../../../bilesenler/parcalar/adet-secici";
import { useOrnekMetni } from "./ortak";

export function AdetSeciciOrnegi() {
  const m = useOrnekMetni();
  const [deger, setDeger] = useState(1);
  return (
    <AdetSecici
      deger={deger}
      enCok={5}
      onDegerDegisti={setDeger}
      etiketler={{ grup: m("adet"), azalt: m("adetAzalt"), artir: m("adetArtir") }}
    />
  );
}
