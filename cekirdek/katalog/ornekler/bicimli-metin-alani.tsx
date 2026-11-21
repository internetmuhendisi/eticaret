"use client";
// Biçimli metin alanının örneği (kart 0263): dolu alan ve hatalı alan. Metinleri panelin biçimli metin metinleridir.
import { useState } from "react";
import { FormAlani } from "../../../bilesenler/form/form-alani";
import {
  BicimliMetinAlani,
  type BicimliMetinMetinleri,
} from "../../../bilesenler/parcalar/bicimli-metin-alani";
import { doldur } from "../../metinler/doldur";
import { usePanelMetni } from "../../metinler/panel-metni";
import { aciklamaBaglantisiGecerliMi } from "../../moduller/urun/aciklama-baglantisi";
import { useOrnekMetni } from "./ortak";

export function BicimliMetinAlaniOrnegi() {
  const m = useOrnekMetni();
  const metin = usePanelMetni();
  const [dolu, setDolu] = useState(m("urunAciklamasiDegeri"));
  const [hatali, setHatali] = useState("");
  const metinler = (alan: string): BicimliMetinMetinleri => ({
    aracCubugu: doldur(metin("yonetim.bicimliMetin.aracCubugu"), { alan }),
    kalin: metin("yonetim.bicimliMetin.kalin"),
    egik: metin("yonetim.bicimliMetin.egik"),
    araBaslik: metin("yonetim.bicimliMetin.araBaslik"),
    maddeListesi: metin("yonetim.bicimliMetin.maddeListesi"),
    siraliListe: metin("yonetim.bicimliMetin.siraliListe"),
    baglanti: metin("yonetim.bicimliMetin.baglanti"),
    baglantiAdresi: metin("yonetim.bicimliMetin.baglantiAdresi"),
    baglantiUygula: metin("yonetim.bicimliMetin.baglantiUygula"),
    baglantiKaldir: metin("yonetim.bicimliMetin.baglantiKaldir"),
    baglantiGecersiz: metin("yonetim.bicimliMetin.baglantiGecersiz"),
  });
  return (
    <>
      <FormAlani etiket={m("urunAciklamasi")} aciklama={m("urunAciklamasiAciklama")}>
        {(alan) => (
          <BicimliMetinAlani
            {...alan}
            etiket={m("urunAciklamasi")}
            deger={dolu}
            onDegerDegisti={setDolu}
            baglantiGecerliMi={aciklamaBaglantisiGecerliMi}
            metinler={metinler(m("urunAciklamasi"))}
          />
        )}
      </FormAlani>
      <FormAlani etiket={m("urunAciklamasi")} hata={m("urunAciklamasiHata")}>
        {(alan) => (
          <BicimliMetinAlani
            {...alan}
            etiket={m("urunAciklamasi")}
            deger={hatali}
            onDegerDegisti={setHatali}
            baglantiGecerliMi={aciklamaBaglantisiGecerliMi}
            metinler={metinler(m("urunAciklamasi"))}
          />
        )}
      </FormAlani>
    </>
  );
}
