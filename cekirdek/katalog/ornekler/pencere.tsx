"use client";
import { FormAlani } from "../../../bilesenler/form/form-alani";
import { bildirimGoster } from "../../../bilesenler/parcalar/bildirim";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import {
  Pencere,
  PencereAciklamasi,
  PencereAlti,
  PencereBasligi,
  PencereIcerigi,
  PencereKapat,
  PencereTetikleyici,
  PencereUstu,
} from "../../../bilesenler/parcalar/pencere";
import {
  SecimDegeri,
  SecimKutusu,
  SecimListesi,
  SecimOgesi,
  SecimTetikleyici,
} from "../../../bilesenler/parcalar/secim-kutusu";
import { usePanelMetni } from "../../metinler/panel-metni";
import { useOrnekMetni } from "./ortak";

export function PencereOrnegi() {
  const metin = usePanelMetni();
  const m = useOrnekMetni();
  return (
    <div className="flex flex-wrap gap-2">
      <Pencere>
        <PencereTetikleyici asChild>
          <Dugme tur="cerceveli">{m("pencereyiAc")}</Dugme>
        </PencereTetikleyici>
        <PencereIcerigi kapatEtiketi={metin("ortak.parca.kapat")}>
          <PencereUstu>
            <PencereBasligi>{m("pencereBasligi")}</PencereBasligi>
            <PencereAciklamasi>{m("pencereAciklamasi")}</PencereAciklamasi>
          </PencereUstu>
          {/* Pencerenin içinde açılan liste ve pencereden verilen bildirim (katman ve inert denemesi). */}
          <FormAlani etiket={m("zaman")}>
            {(alan) => (
              <SecimKutusu name="penceredeZaman">
                <SecimTetikleyici {...alan}>
                  <SecimDegeri placeholder={m("zamanSec")} />
                </SecimTetikleyici>
                <SecimListesi>
                  <SecimOgesi value="sabah">{m("sabah")}</SecimOgesi>
                  <SecimOgesi value="ogle">{m("ogle")}</SecimOgesi>
                  <SecimOgesi value="aksam">{m("aksam")}</SecimOgesi>
                </SecimListesi>
              </SecimKutusu>
            )}
          </FormAlani>
          <div>
            <Dugme tur="ikincil" onClick={() => bildirimGoster("basari", m("bildirimMetni"))}>
              {m("bildirimGoster")}
            </Dugme>
          </div>
          <PencereAlti>
            <PencereKapat asChild>
              <Dugme tur="cerceveli">{metin("ortak.islem.vazgec")}</Dugme>
            </PencereKapat>
            <PencereKapat asChild>
              <Dugme>{metin("ortak.islem.kaydet")}</Dugme>
            </PencereKapat>
          </PencereAlti>
        </PencereIcerigi>
      </Pencere>
    </div>
  );
}
