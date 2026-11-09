// Duyuru şeridinin görünüşü (kart 0108). Zemin ve yazı rengi birlikte, okunur çiftiyle seçilir; sınıf adları
// parçalardan birleştirilmez.
import { Baglanti } from "../../../../bilesenler/parcalar/baglanti";
import { sinif } from "../../../../bilesenler/parcalar/sinif";
import type { BolumGorunumuOzellikleri } from "../../bolum-kutuphanesi/gorunumler";
import { baglantiMi, metinMi } from "../ortak/deger";
import { yeniSekmeOzellikleri } from "../ortak/menu";

const renkler = {
  afis: { zemin: "bg-afis", yazi: "text-afis-ustu" },
  birincil: { zemin: "bg-birincil", yazi: "text-birincil-ustu" },
  "alt-kisim": { zemin: "bg-alt-kisim", yazi: "text-alt-kisim-ustu" },
} as const;
const renginSiniflari = (zemin: unknown) =>
  metinMi(zemin) && Object.hasOwn(renkler, zemin)
    ? renkler[zemin as keyof typeof renkler]
    : renkler.afis;

export function DuyuruSeridiGorunumu({ gorunum, degerler: ham }: BolumGorunumuOzellikleri) {
  // Değerler tarifin şemasından geçmiştir (kart 0106); türleri tarifteki alanlardır.
  const degerler = ham as { metin?: unknown; zemin?: unknown; baglanti?: unknown };
  if (!metinMi(degerler.metin)) return null;
  const renk = renginSiniflari(degerler.zemin);
  const baglanti = baglantiMi(degerler.baglanti) ? degerler.baglanti : undefined;
  return (
    <div
      className={sinif(
        "px-4 text-center odak-yazi-renginde",
        renk.zemin,
        renk.yazi,
        gorunum === "ince" ? "py-1 text-kucuk" : "py-2 font-kalin",
      )}
    >
      {baglanti === undefined ? (
        <p>{degerler.metin}</p>
      ) : (
        <Baglanti
          href={baglanti.adres}
          className={sinif("min-h-11", renk.yazi)}
          {...yeniSekmeOzellikleri(baglanti.yeniSekme)}
        >
          {degerler.metin}
        </Baglanti>
      )}
    </div>
  );
}
