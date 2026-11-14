// Duyuru şeridinin görünüşü (kart 0108; Canlı Çarşı taslağı). Zemin ve yazı rengi birlikte, okunur çiftiyle seçilir;
// sınıf adları parçalardan birleştirilmez. İki yana görünümünde metin solda, mağazanın telefonu sağdadır (telefonda
// yalnız metin); ortalı görünümde yalnız metin, kalın.
import { Ikon } from "../../../../bilesenler/ikonlar/ikon";
import { Baglanti } from "../../../../bilesenler/parcalar/baglanti";
import { sinif } from "../../../../bilesenler/parcalar/sinif";
import type { BolumGorunumuOzellikleri } from "../../bolum-kutuphanesi/gorunumler";
import { baglantiMi, metinMi } from "../ortak/deger";
import { yeniSekmeOzellikleri } from "../ortak/menu";

const renkler = {
  "alt-kisim": { zemin: "bg-alt-kisim", yazi: "text-alt-kisim-ustu" },
  afis: { zemin: "bg-afis", yazi: "text-afis-ustu" },
  birincil: { zemin: "bg-birincil", yazi: "text-birincil-ustu" },
} as const;
const renginSiniflari = (zemin: unknown) =>
  metinMi(zemin) && Object.hasOwn(renkler, zemin)
    ? renkler[zemin as keyof typeof renkler]
    : renkler["alt-kisim"];

export function DuyuruSeridiGorunumu({ gorunum, degerler: ham, baglam }: BolumGorunumuOzellikleri) {
  // Değerler tarifin şemasından geçmiştir (kart 0106); türleri tarifteki alanlardır.
  const degerler = ham as { metin?: unknown; zemin?: unknown; baglanti?: unknown };
  if (!metinMi(degerler.metin)) return null;
  const renk = renginSiniflari(degerler.zemin);
  const baglanti = baglantiMi(degerler.baglanti) ? degerler.baglanti : undefined;
  const ikiYana = gorunum === "iki-yana";
  const telefon = ikiYana ? baglam.iletisim.telefon : undefined;
  const yazi =
    baglanti === undefined ? (
      <p className="py-2">{degerler.metin}</p>
    ) : (
      <Baglanti
        href={baglanti.adres}
        // Bağlantı kendiliğinden sola yaslıdır (kart 0130); ortalı şeritte iki satıra inen yazı da ortalı kalır.
        className={sinif(
          "min-h-11 min-w-0 shrink",
          ikiYana ? "font-normal" : "text-center",
          renk.yazi,
        )}
        {...yeniSekmeOzellikleri(baglanti.yeniSekme)}
      >
        {degerler.metin}
      </Baglanti>
    );
  return (
    <div className={sinif("odak-yazi-renginde", renk.zemin, renk.yazi)}>
      <div
        className={sinif(
          "mx-auto flex max-w-icerik items-center gap-3 px-4 tablet:px-6",
          ikiYana ? "justify-between" : "justify-center text-center font-kalin",
        )}
      >
        {yazi}
        {telefon === undefined ? null : (
          <Baglanti
            href={telefon.adres}
            className={sinif(
              "hidden min-h-11 gap-2 font-normal no-underline hover:underline masaustu:inline-flex",
              renk.yazi,
            )}
          >
            <Ikon ad="telefon" />
            {telefon.metin}
          </Baglanti>
        )}
      </div>
    </div>
  );
}
