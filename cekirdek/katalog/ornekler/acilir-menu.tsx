"use client";
import { useState } from "react";
import {
  AcilirMenu,
  AcilirMenuAyraci,
  AcilirMenuBasligi,
  AcilirMenuGrubu,
  AcilirMenuIcerigi,
  AcilirMenuOgesi,
  AcilirMenuOnayOgesi,
  AcilirMenuRadyoGrubu,
  AcilirMenuRadyoOgesi,
  AcilirMenuTetikleyici,
  AltMenu,
  AltMenuIcerigi,
  AltMenuTetikleyici,
} from "../../../bilesenler/parcalar/acilir-menu";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import { useOrnekMetni } from "./ortak";

export function AcilirMenuOrnegi() {
  const m = useOrnekMetni();
  const [eylem, setEylem] = useState<string | null>(null);
  const [ayrintilar, setAyrintilar] = useState(true);
  const [gorunum, setGorunum] = useState("liste");
  return (
    <div className="flex flex-wrap items-center gap-4">
      <AcilirMenu>
        <AcilirMenuTetikleyici asChild>
          <Dugme tur="cerceveli">{m("eylemler")}</Dugme>
        </AcilirMenuTetikleyici>
        <AcilirMenuIcerigi align="start">
          <AcilirMenuGrubu>
            <AcilirMenuOgesi onSelect={() => setEylem(m("duzenle"))}>
              {m("duzenle")}
            </AcilirMenuOgesi>
            <AcilirMenuOgesi onSelect={() => setEylem(m("kopyala"))}>
              {m("kopyala")}
            </AcilirMenuOgesi>
            <AltMenu>
              <AltMenuTetikleyici>{m("paylas")}</AltMenuTetikleyici>
              <AltMenuIcerigi>
                <AcilirMenuOgesi onSelect={() => setEylem(m("epostaIle"))}>
                  {m("epostaIle")}
                </AcilirMenuOgesi>
                <AcilirMenuOgesi onSelect={() => setEylem(m("baglantiyiKopyala"))}>
                  {m("baglantiyiKopyala")}
                </AcilirMenuOgesi>
              </AltMenuIcerigi>
            </AltMenu>
          </AcilirMenuGrubu>
          <AcilirMenuAyraci />
          <AcilirMenuBasligi>{m("gorunum")}</AcilirMenuBasligi>
          <AcilirMenuOnayOgesi
            checked={ayrintilar}
            onCheckedChange={(deger) => setAyrintilar(deger === true)}
          >
            {m("ayrintilar")}
          </AcilirMenuOnayOgesi>
          <AcilirMenuRadyoGrubu value={gorunum} onValueChange={setGorunum}>
            <AcilirMenuRadyoOgesi value="liste">{m("liste")}</AcilirMenuRadyoOgesi>
            <AcilirMenuRadyoOgesi value="izgara">{m("izgara")}</AcilirMenuRadyoOgesi>
          </AcilirMenuRadyoGrubu>
          <AcilirMenuAyraci />
          <AcilirMenuOgesi tur="tehlike" onSelect={() => setEylem(m("sil"))}>
            {m("sil")}
          </AcilirMenuOgesi>
        </AcilirMenuIcerigi>
      </AcilirMenu>
      {eylem === null ? null : (
        <p role="status" className="flex gap-2">
          <span>{m("secilenEylem")}</span>
          <span>{eylem}</span>
        </p>
      )}
    </div>
  );
}
