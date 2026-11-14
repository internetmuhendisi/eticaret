// Güven şeridinin görünüşü (kart 0110; Canlı Çarşı taslağı). Masaüstünde maddeler bir sırada, telefonda iki
// sütunda. Metindeki yer tutucular bağlamdaki ayar değerleriyle dolar; değeri olmayan madde çizilmez.
import { Ikon } from "../../../../bilesenler/ikonlar/ikon";
import { sinif } from "../../../../bilesenler/parcalar/sinif";
import { metin } from "../../../metinler/site-metni";
import type { VitrinBaglami } from "../../bolum-kutuphanesi/baglam";
import type { BolumGorunumuOzellikleri } from "../../bolum-kutuphanesi/gorunumler";
import type { BolumDegerleri } from "../../bolum-kutuphanesi/tarif";
import { secimDegeri } from "../../bolum-kutuphanesi/tarif";
import { yerTutuculariDoldur } from "../../bolum-kutuphanesi/yer-tutucu";
import { metinMi } from "../ortak/deger";
import { type guvenIkonlari, guvenSeridi } from "./tarif";

const ikonAlani = guvenSeridi.alanlar.maddeler.alanlar.ikon;

// Değeri olan maddeler (yer tutucusu dolanlar). Panel de bölümün boş olup olmadığını bununla bulur (kart 0172).
export const guvenSeridiMaddeleri = (ham: BolumDegerleri, baglam: VitrinBaglami) => {
  const degerler = ham as { maddeler?: unknown };
  return (
    Array.isArray(degerler.maddeler)
      ? (degerler.maddeler as { ikon?: unknown; metin?: unknown }[])
      : []
  ).flatMap((madde, sira) => {
    const yazi = metinMi(madde.metin)
      ? yerTutuculariDoldur(madde.metin, baglam.yerTutucular)
      : undefined;
    if (yazi === undefined) return [];
    const ikon = secimDegeri(ikonAlani, madde.ikon) as (typeof guvenIkonlari)[number];
    return [{ sira, ikon, yazi }];
  });
};

export function GuvenSeridiGorunumu({ gorunum, degerler: ham, baglam }: BolumGorunumuOzellikleri) {
  const maddeler = guvenSeridiMaddeleri(ham, baglam);
  if (maddeler.length === 0) return null;
  const kutulu = gorunum === "kutulu";
  return (
    <section
      aria-label={metin("vitrin.bolum.guvenSeridi.etiket")}
      className="mx-auto w-full max-w-icerik px-4 tablet:px-6"
    >
      <ul
        className={sinif(
          kutulu ? "grid grid-cols-1 gap-4 tablet:grid-cols-2" : "grid grid-cols-2 gap-4",
          maddeler.length >= 4
            ? "masaustu:grid-cols-4"
            : "masaustu:grid-flow-col masaustu:auto-cols-fr",
        )}
      >
        {maddeler.map((madde) => (
          <li
            key={madde.sira}
            className={sinif(
              "flex min-w-0 items-center gap-3 font-orta",
              kutulu ? "rounded-orta border border-kenar p-4" : "justify-center",
            )}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-dugme bg-yuzey text-vurgu-yazi">
              <Ikon ad={madde.ikon} />
            </span>
            <span className="min-w-0 wrap-anywhere">{madde.yazi}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
