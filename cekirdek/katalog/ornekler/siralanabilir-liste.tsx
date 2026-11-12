"use client";
import { useState } from "react";
import { SiralanabilirListe } from "../../../bilesenler/parcalar/siralanabilir-liste";
import { useMetin } from "../../metinler/istemci-metni";
import { siralamaMetinleri } from "../../metinler/siralama-metinleri";
import { doldur } from "../../moduller/eposta/sablon";
import { useOrnekMetni } from "./ortak";

// Kodlar örneğin kimlikleridir, metin değildir.
const baslangic = [
  "bolumSlider",
  "bolumGuvenSeridi",
  "bolumKampanya",
  "bolumUrunVitrini",
  "bolumBulten",
];

export function SiralanabilirListeOrnegi() {
  const metin = useMetin();
  const m = useOrnekMetni();
  const [ogeler, setOgeler] = useState(baslangic);
  return (
    <SiralanabilirListe
      ogeler={ogeler}
      anahtar={(kod) => kod}
      ad={(kod) => m(kod)}
      siralaninca={setOgeler}
      etiket={m("siralanabilirListe")}
      metinler={siralamaMetinleri(metin)}
      satir={(kod) => (
        <span className="flex min-w-0 flex-col">
          <span className="font-kalin">{m(kod)}</span>
          <span className="text-kucuk text-soluk-yazi">
            {doldur(m("satirAciklamasi"), { sira: String(ogeler.indexOf(kod) + 1) })}
          </span>
        </span>
      )}
    />
  );
}
