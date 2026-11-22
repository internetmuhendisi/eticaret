"use client";
import { useState } from "react";
import { IkonDugmesi } from "../../../bilesenler/parcalar/dugme";
import { SiralanabilirListe } from "../../../bilesenler/parcalar/siralanabilir-liste";
import { doldur } from "../../metinler/doldur";
import { usePanelMetni } from "../../metinler/panel-metni";
import { siralamaMetinleri } from "../../metinler/siralama-metinleri";
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
  const metin = usePanelMetni();
  const m = useOrnekMetni();
  const [ogeler, setOgeler] = useState(baslangic);
  const [izgara, setIzgara] = useState(baslangic.slice(0, 4));
  return (
    <div className="flex flex-col gap-6">
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
      <div className="flex flex-col gap-2">
        <span className="font-kalin">{m("siralanabilirIzgara")}</span>
        <SiralanabilirListe
          duzen="izgara"
          ogeler={izgara}
          anahtar={(kod) => kod}
          ad={(kod) => m(kod)}
          siralaninca={setIzgara}
          etiket={m("izgaraListe")}
          metinler={siralamaMetinleri(metin, { duzen: "izgara" })}
          satir={(kod) => (
            <span className="flex aspect-square items-center justify-center rounded-kucuk bg-yuzey p-2 text-center text-kucuk">
              {m(kod)}
            </span>
          )}
          eylemler={(kod) => (
            <IkonDugmesi ikon="duzenle" etiket={doldur(m("duzenle"), { ad: m(kod) })} />
          )}
        />
      </div>
    </div>
  );
}
