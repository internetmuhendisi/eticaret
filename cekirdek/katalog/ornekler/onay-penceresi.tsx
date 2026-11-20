"use client";
import { useState } from "react";
import { bildirimGoster } from "../../../bilesenler/parcalar/bildirim";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import { OnayPenceresi } from "../../../bilesenler/parcalar/onay-penceresi";
import { usePanelMetni } from "../../metinler/panel-metni";
import { useOrnekMetni } from "./ortak";

export function OnayPenceresiOrnegi() {
  const metin = usePanelMetni();
  const m = useOrnekMetni();
  const [acik, setAcik] = useState(false);
  return (
    <div className="flex flex-wrap gap-2">
      <Dugme tur="tehlike" onClick={() => setAcik(true)}>
        {m("onayAc")}
      </Dugme>
      <OnayPenceresi
        acik={acik}
        acikDegisince={setAcik}
        baslik={m("onayBaslik")}
        aciklama={m("onayAciklama")}
        onayEtiketi={m("onaySil")}
        vazgecEtiketi={metin("ortak.islem.vazgec")}
        onayla={() => bildirimGoster("basari", m("onaySilindi"))}
      />
    </div>
  );
}
