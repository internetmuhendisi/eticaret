// Hazır temaların mağaza sahibine açtığı seçenekler (kart 0114, karar 0092). Üç hazır tema aynı seçenekleri
// açar: mağaza sahibi temanın ana rengini, üç temanın yazı tipi çiftlerinden birini, köşe ve düğme biçimini
// değiştirebilir. Seçenek seçilmemişse temanın kendi değeri geçerlidir (cekirdek/temalar/birlesim.ts).
import {
  keskinCizgiDegerleri,
  type TemaDegerleri,
  varsayilanTemaDegerleri,
  yumusakMevsimDegerleri,
} from "../../../bilesenler/tasarim-degerleri/degerler.ts";
import type { TemaTanimiGirdisi } from "../sema.ts";

// Yazı tipi seçenekleri üç temanın kendi yazı tipi çiftleridir; değerleri tasarım değerlerindedir.
const cift = ({ govde, baslik }: TemaDegerleri["yaziTipleri"]) => ({ govde, baslik });
export const hazirTemaYaziTipleri = {
  "inter-jost": cift(varsayilanTemaDegerleri.yaziTipleri),
  manrope: cift(yumusakMevsimDegerleri.yaziTipleri),
  "inter-archivo": cift(keskinCizgiDegerleri.yaziTipleri),
};

export const hazirTemaSecenekleri: TemaTanimiGirdisi["magazaSecenekleri"] = {
  renkler: ["birincil"],
  yaziTipleri: hazirTemaYaziTipleri,
  koseler: {
    keskin: { kucuk: "0", orta: "0" },
    orta: { kucuk: "4px", orta: "8px" },
    yuvarlak: { kucuk: "8px", orta: "16px" },
  },
  dugmeBicimleri: { hap: "9999px", yumusak: "8px", koseli: "0" },
};
