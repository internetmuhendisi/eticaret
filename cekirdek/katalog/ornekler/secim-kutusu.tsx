"use client";
import { FormAlani } from "../../../bilesenler/form/form-alani";
import {
  SecimAyraci,
  SecimBasligi,
  SecimDegeri,
  SecimGrubu,
  SecimKutusu,
  SecimListesi,
  SecimOgesi,
  SecimTetikleyici,
} from "../../../bilesenler/parcalar/secim-kutusu";
import { useOrnekMetni } from "./ortak";

// Sade liste ve başlıklı gruplar.
export function SecimKutusuOrnegi() {
  const m = useOrnekMetni();
  return (
    <>
      <FormAlani etiket={m("zaman")}>
        {(alan) => (
          <SecimKutusu name="zaman">
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
      <FormAlani etiket={m("kargoFirmasi")}>
        {(alan) => (
          <SecimKutusu name="kargo">
            <SecimTetikleyici {...alan}>
              <SecimDegeri placeholder={m("kargoSec")} />
            </SecimTetikleyici>
            <SecimListesi>
              <SecimGrubu>
                <SecimBasligi>{m("yurtici")}</SecimBasligi>
                <SecimOgesi value="standart">{m("standart")}</SecimOgesi>
                <SecimOgesi value="hizli">{m("hizli")}</SecimOgesi>
              </SecimGrubu>
              <SecimAyraci />
              <SecimGrubu>
                <SecimBasligi>{m("yurtdisi")}</SecimBasligi>
                <SecimOgesi value="uluslararasi">{m("uluslararasi")}</SecimOgesi>
              </SecimGrubu>
              <SecimAyraci />
              <SecimOgesi value="magaza" disabled>
                {m("magazadanTeslim")}
              </SecimOgesi>
            </SecimListesi>
          </SecimKutusu>
        )}
      </FormAlani>
    </>
  );
}
