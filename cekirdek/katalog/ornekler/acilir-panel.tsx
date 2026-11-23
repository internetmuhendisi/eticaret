"use client";
import { useState } from "react";
import { FormAlani } from "../../../bilesenler/form/form-alani";
import {
  AcilirPanel,
  AcilirPanelIcerigi,
  AcilirPanelKapat,
  AcilirPanelTetikleyici,
} from "../../../bilesenler/parcalar/acilir-panel";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { useOrnekMetni } from "./ortak";

export function AcilirPanelOrnegi() {
  const m = useOrnekMetni();
  const [not, setNot] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-4">
      <AcilirPanel>
        <AcilirPanelTetikleyici asChild>
          <Dugme tur="cerceveli">{m("panelAc")}</Dugme>
        </AcilirPanelTetikleyici>
        <AcilirPanelIcerigi aria-label={m("panelAdi")}>
          <FormAlani etiket={m("panelAlani")}>
            {(alan) => (
              <GirisAlani {...alan} value={not} onChange={(olay) => setNot(olay.target.value)} />
            )}
          </FormAlani>
          <AcilirPanelKapat asChild>
            <Dugme tur="birincil">{m("panelKapat")}</Dugme>
          </AcilirPanelKapat>
        </AcilirPanelIcerigi>
      </AcilirPanel>
      <span className="text-kucuk text-soluk-yazi">{not}</span>
    </div>
  );
}
