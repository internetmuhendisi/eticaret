"use client";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import { OnayKutusu } from "../../../bilesenler/parcalar/onay-kutusu";
import {
  YanPencere,
  YanPencereAciklamasi,
  YanPencereAltCubugu,
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
      <YanPencereAltCubuguOrnegi />
    </div>
  );
}

// Uzun formun sabit alt çubuğu (kart 0169): içerik kayarken düğmeler altta kalır.
function YanPencereAltCubuguOrnegi() {
  const metin = useMetin();
  const m = useOrnekMetni();
  return (
    <YanPencere>
      <YanPencereTetikleyici asChild>
        <Dugme tur="cerceveli">{m("yanPencereyiAc")}</Dugme>
      </YanPencereTetikleyici>
      <YanPencereIcerigi kapatEtiketi={metin("ortak.parca.kapat")}>
        <YanPencereUstu>
          <YanPencereBasligi>{m("yanPencereBasligi")}</YanPencereBasligi>
          <YanPencereAciklamasi>{m("yanPencereAciklamasi")}</YanPencereAciklamasi>
        </YanPencereUstu>
        <OnayKutusu name="alt-cubuk-suzgec" etiket={m("stokta")} />
        <YanPencereAltCubugu>
          <YanPencereKapat asChild>
            <Dugme>{m("suzgecleriUygula")}</Dugme>
          </YanPencereKapat>
        </YanPencereAltCubugu>
      </YanPencereIcerigi>
    </YanPencere>
  );
}
