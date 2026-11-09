// Ödeme işaretlerinin görünüşü (kart 0108; Canlı Çarşı taslağı). İşaretler sitede açık ödeme yöntemlerinden gelir;
// hiçbiri yoksa bölüm çizilmez. Alt kısmın en alt satırındadır. Yazılı görünümde her yöntem kenarlı küçük bir
// yazıdır (taslaktaki gibi); yalnız işaret görünümünde ikondur, adı yalnız ekran okuyucuya okunur.
import { Ikon } from "../../../../bilesenler/ikonlar/ikon";
import type { OdemeIsareti } from "../../../kayitlar/odeme";
import type { MetinAnahtari } from "../../../metinler/metin";
import { metin } from "../../../metinler/site-metni";
import type { BolumGorunumuOzellikleri } from "../../bolum-kutuphanesi/gorunumler";

const isaretAdlari = {
  kart: "vitrin.bolum.odemeIsaretleri.isaret.kart",
  havale: "vitrin.bolum.odemeIsaretleri.isaret.havale",
  "kapida-odeme": "vitrin.bolum.odemeIsaretleri.isaret.kapida-odeme",
} as const satisfies Record<OdemeIsareti, MetinAnahtari>;

export function OdemeIsaretleriGorunumu({ gorunum, baglam }: BolumGorunumuOzellikleri) {
  if (baglam.odemeIsaretleri.length === 0) return null;
  const yalnizIsaret = gorunum === "yalniz-isaret";
  return (
    <section aria-label={metin("vitrin.bolum.odemeIsaretleri.baslik")}>
      <ul className="flex flex-wrap items-center gap-2">
        {baglam.odemeIsaretleri.map((isaret) =>
          yalnizIsaret ? (
            <li key={isaret}>
              <Ikon ad={isaret} className="size-6" />
              <span className="sr-only">{metin(isaretAdlari[isaret])}</span>
            </li>
          ) : (
            <li key={isaret} className="rounded-kucuk border border-alt-kisim-soluk px-2 py-1">
              {metin(isaretAdlari[isaret])}
            </li>
          ),
        )}
      </ul>
    </section>
  );
}
