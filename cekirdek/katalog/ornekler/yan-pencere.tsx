"use client";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import { OnayKutusu } from "../../../bilesenler/parcalar/onay-kutusu";
import {
  YanPencere,
  YanPencereAciklamasi,
  YanPencereAlti,
  YanPencereBasligi,
  YanPencereIcerigi,
  YanPencereKapat,
  YanPencereTetikleyici,
  YanPencereUstu,
} from "../../../bilesenler/parcalar/yan-pencere";
import { useMetin } from "../../metinler/istemci-metni";
import { useOrnekMetni } from "./ortak";

export function YanPencereOrnegi() {
  const metin = useMetin();
  const m = useOrnekMetni();
  return (
    <div className="flex flex-wrap gap-2">
      <YanPencere>
        <YanPencereTetikleyici asChild>
          <Dugme tur="cerceveli">{m("yanPencereyiAc")}</Dugme>
        </YanPencereTetikleyici>
        <YanPencereIcerigi kapatEtiketi={metin("ortak.parca.kapat")}>
          <YanPencereUstu>
            <YanPencereBasligi>{m("yanPencereBasligi")}</YanPencereBasligi>
            <YanPencereAciklamasi>{m("yanPencereAciklamasi")}</YanPencereAciklamasi>
          </YanPencereUstu>
          <OnayKutusu name="suzgec" etiket={m("stokta")} />
          <YanPencereAlti>
            <YanPencereKapat asChild>
              <Dugme>{m("suzgecleriUygula")}</Dugme>
            </YanPencereKapat>
          </YanPencereAlti>
        </YanPencereIcerigi>
      </YanPencere>
    </div>
  );
}
