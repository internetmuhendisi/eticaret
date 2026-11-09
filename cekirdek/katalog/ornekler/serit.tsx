"use client";
import { FormAlani } from "../../../bilesenler/form/form-alani";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { Kart } from "../../../bilesenler/parcalar/kart";
import {
  Serit,
  SeritDugmeleri,
  SeritIcerigi,
  SeritOgesi,
} from "../../../bilesenler/parcalar/serit";
import { useMetin } from "../../metinler/istemci-metni";
import { useOrnekMetni } from "./ortak";

export function SeritOrnegi() {
  const metin = useMetin();
  const m = useOrnekMetni();
  return (
    <Serit
      metinler={{
        etiket: m("seritEtiketi"),
        seritTanimi: metin("ortak.parca.seritTanimi"),
        ogeTanimi: metin("ortak.parca.seritOgesi"),
        onceki: metin("ortak.parca.onceki"),
        sonraki: metin("ortak.parca.sonraki"),
      }}
    >
      <SeritIcerigi>
        {(["ogeBir", "ogeIki", "ogeUc", "ogeDort"] as const).map((anahtar) => (
          <SeritOgesi key={anahtar} className="tablet:basis-1/2">
            <Kart className="min-h-20 justify-center">{m(anahtar)}</Kart>
          </SeritOgesi>
        ))}
      </SeritIcerigi>
      {/* Şeridin içindeki alan ok tuşlarını kendisi kullanır, şerit kaymaz. */}
      <FormAlani etiket={m("seritNotu")}>
        {(alan) => <GirisAlani {...alan} name="seritNotu" />}
      </FormAlani>
      <SeritDugmeleri />
    </Serit>
  );
}
