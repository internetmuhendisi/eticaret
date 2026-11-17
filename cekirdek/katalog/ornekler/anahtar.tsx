"use client";
import { useState } from "react";
import { Anahtar } from "../../../bilesenler/parcalar/anahtar";
import { useOrnekMetni } from "./ortak";

export function AnahtarOrnegi() {
  const m = useOrnekMetni();
  const [acik, setAcik] = useState(true);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span>{m("anahtarEtiketi")}</span>
        <Anahtar
          etiket={m("anahtarEtiketi")}
          acikYazisi={m("anahtarAcik")}
          kapaliYazisi={m("anahtarKapali")}
          checked={acik}
          onCheckedChange={setAcik}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span>{m("anahtarIkinci")}</span>
        <Anahtar
          etiket={m("anahtarIkinci")}
          acikYazisi={m("anahtarAcik")}
          kapaliYazisi={m("anahtarKapali")}
          checked={false}
          disabled
        />
      </div>
    </div>
  );
}
