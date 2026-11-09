// Ödeme işaretlerinin görünüşü (kart 0108). İşaretler sitede açık ödeme yöntemlerinden gelir; hiçbiri yoksa bölüm
// çizilmez. "Yalnız işaret" görünümünde yazı yalnız ekran okuyucuya okunur.
import { Ikon } from "../../../../bilesenler/ikonlar/ikon";
import { sinif } from "../../../../bilesenler/parcalar/sinif";
import type { OdemeIsareti } from "../../../kayitlar/odeme";
import type { MetinAnahtari } from "../../../metinler/metin";
import { metin } from "../../../metinler/site-metni";
import type { BolumGorunumuOzellikleri } from "../../bolum-kutuphanesi/gorunumler";
import { altKisimSiniflari as s } from "../ortak/alt-kisim";

const isaretAdlari = {
  kart: "vitrin.bolum.odemeIsaretleri.isaret.kart",
  havale: "vitrin.bolum.odemeIsaretleri.isaret.havale",
  "kapida-odeme": "vitrin.bolum.odemeIsaretleri.isaret.kapida-odeme",
} as const satisfies Record<OdemeIsareti, MetinAnahtari>;

export function OdemeIsaretleriGorunumu({ gorunum, baglam }: BolumGorunumuOzellikleri) {
  if (baglam.odemeIsaretleri.length === 0) return null;
  const yalnizIsaret = gorunum === "yalniz-isaret";
  return (
    <section aria-label={metin("vitrin.bolum.odemeIsaretleri.baslik")} className={s.kutu}>
      <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {baglam.odemeIsaretleri.map((isaret) => (
          <li key={isaret} className="flex items-center gap-2">
            <Ikon ad={isaret} className="size-6" />
            <span className={sinif(yalnizIsaret && "sr-only")}>{metin(isaretAdlari[isaret])}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
