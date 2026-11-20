// E-postanın görünüşü (kart 0240, karar 0153): sitenin seçili temasının açık renkleri, yazı tipleri, yazı boyları ve
// köşeleri (temanın değerleri ile mağaza sahibinin ayarlarının birleşimi, cekirdek/temalar/birlesim.ts). E-posta
// sitenin koyu temasını almaz. Tema okunamazsa e-posta düşmez: hata kaydedilir, ortak başlangıç değerleriyle gider.
import {
  type TemaDegerleri,
  varsayilanTemaDegerleri,
} from "../../../bilesenler/tasarim-degerleri/degerler.ts";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { hatayiKaydet } from "../../izleme/hata-katmani.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";

type YaziBoyu = { boy: string; satir: string };

export type EpostaGorunusu = {
  renkler: Pick<
    TemaDegerleri["renkler"]["acik"],
    | "zemin"
    | "yuzey"
    | "yazi"
    | "soluk-yazi"
    | "kenar"
    | "birincil"
    | "birincil-ustu"
    | "alt-kisim"
    | "alt-kisim-ustu"
  >;
  yaziTipi: string;
  baslikYaziTipi: string;
  kodYaziTipi: string;
  yaziBoylari: {
    kucuk: YaziBoyu;
    govde: YaziBoyu;
    orta: YaziBoyu;
    buyuk: YaziBoyu;
    baslik: YaziBoyu;
  };
  kalinliklar: { normal: string; kalin: string; enKalin: string; baslik: string };
  kose: string;
  dugmeKosesi: string;
};

export const temadanGorunus = (d: TemaDegerleri): EpostaGorunusu => {
  const r = d.renkler.acik;
  return {
    renkler: {
      zemin: r.zemin,
      yuzey: r.yuzey,
      yazi: r.yazi,
      "soluk-yazi": r["soluk-yazi"],
      kenar: r.kenar,
      birincil: r.birincil,
      "birincil-ustu": r["birincil-ustu"],
      "alt-kisim": r["alt-kisim"],
      "alt-kisim-ustu": r["alt-kisim-ustu"],
    },
    yaziTipi: d.yaziTipleri.govde,
    baslikYaziTipi: d.yaziTipleri.baslik,
    kodYaziTipi: d.yaziTipleri.kod,
    yaziBoylari: {
      kucuk: d.yaziBoylari.kucuk,
      // E-postada gövde bir boy büyüktür: telefonun e-posta programı küçük yazıyı büyütmez.
      govde: d.yaziBoylari.orta,
      orta: d.yaziBoylari.buyuk,
      buyuk: d.yaziBoylari.buyuk,
      baslik: d.yaziBoylari["baslik-2"],
    },
    kalinliklar: {
      normal: d.kalinliklar.normal,
      kalin: d.kalinliklar.kalin,
      enKalin: d.kalinliklar["en-kalin"],
      baslik: d.kalinliklar["baslik-kalinligi"],
    },
    kose: d.koseler.orta,
    dugmeKosesi: d.koseler.dugme,
  };
};

export const varsayilanEpostaGorunusu = temadanGorunus(varsayilanTemaDegerleri);

export const epostaGorunusu = async (vt: Veritabani, site: Site): Promise<EpostaGorunusu> => {
  try {
    // Tema servisi ve birleşim işlevin içinde yüklenir: dosyanın başında yüklenince arka plan sürecinde döngüsel
    // yükleme oluyordu (sipariş → e-posta → tema → düzen → ...; açılış testi yakaladı, kart 0240).
    const [{ temaServisi }, { temaBirlesimi }] = await Promise.all([
      import("../tema/servis.ts"),
      import("../../temalar/birlesim.ts"),
    ]);
    const { tema, ayarlar } = await temaServisi(() => site).gecerliTema(vt);
    return temadanGorunus(temaBirlesimi(tema.tanim, ayarlar));
  } catch (hata) {
    hatayiKaydet(hata, { kaynak: "eposta-gorunusu" });
    return varsayilanEpostaGorunusu;
  }
};
