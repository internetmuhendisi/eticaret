// Marka logolarının görünüşü (kart 0111; Canlı Çarşı taslağının marka satırı). Her kutu markanın sayfasına
// gider: kenarlı kutuda logo, logosu olmayan markada adı başlık yazı tipiyle (kullanıcı kararı). Logonun
// alternatif metni markanın adıdır. Bağlamda olmayan (silinmiş, olmayan) marka çizilmez; hiçbiri kalmazsa bölüm
// çizilmez.
import Link from "next/link";
import { useId } from "react";
import {
  Serit,
  SeritDugmeleri,
  SeritIcerigi,
  SeritOgesi,
} from "../../../../bilesenler/parcalar/serit";
import { metin } from "../../../metinler/site-metni";
import type { BaglamMarkasi } from "../../bolum-kutuphanesi/baglam";
import { BolumGorseli } from "../../bolum-kutuphanesi/gorsel";
import type { BolumGorunumuOzellikleri } from "../../bolum-kutuphanesi/gorunumler";
import { metinMi } from "../ortak/deger";
import { BolumBasligi } from "../ortak/urun-izgarasi";

export function MarkaLogolariGorunumu({
  gorunum,
  degerler: ham,
  baglam,
}: BolumGorunumuOzellikleri) {
  const baslikKimligi = useId();
  // Değerler tarifin şemasından geçmiştir (kart 0106); türleri tarifteki alanlardır.
  const degerler = ham as { baslik?: unknown; markalar?: unknown };
  const markalar = (
    Array.isArray(degerler.markalar) ? (degerler.markalar as { marka?: unknown }[]) : []
  ).flatMap((oge, sira) => {
    // Kimlik tarifin şemasından geçmiştir; bağlamda olmayan marka silinmiş ya da yoktur.
    const marka =
      typeof oge.marka === "string" ? baglam.markalar[oge.marka.toLowerCase()] : undefined;
    return marka === undefined ? [] : [{ anahtar: String(sira), marka }];
  });
  if (markalar.length === 0) return null;
  const baslik = metinMi(degerler.baslik) ? degerler.baslik : undefined;
  const etiket = baslik ?? metin("vitrin.bolum.markaLogolari.etiket");
  const kutu = (marka: BaglamMarkasi) => {
    const logo = marka.logo === undefined ? undefined : baglam.gorseller[marka.logo];
    return (
      <Link
        href={marka.adres}
        className="flex h-20 min-w-0 items-center justify-center rounded-orta border border-kenar bg-zemin px-4 text-center font-baslik text-buyuk font-kalin text-yazi no-underline hover:border-yazi"
      >
        {logo === undefined ? (
          <span className="min-w-0 wrap-anywhere">{marka.ad}</span>
        ) : (
          <BolumGorseli
            baglam={baglam}
            gorsel={marka.logo}
            alternatifMetin={marka.ad}
            genislik="besteBir"
            className="max-h-12 w-auto max-w-full object-contain"
          />
        )}
      </Link>
    );
  };
  return (
    <section
      {...(baslik === undefined ? { "aria-label": etiket } : { "aria-labelledby": baslikKimligi })}
      className="mx-auto flex w-full max-w-icerik flex-col gap-4 px-4 tablet:px-6"
    >
      <BolumBasligi kimlik={baslikKimligi} baslik={baslik} />
      {gorunum === "kaydirmali" ? (
        <Serit
          metinler={{
            etiket,
            seritTanimi: metin("ortak.parca.seritTanimi"),
            ogeTanimi: metin("ortak.parca.seritOgesi"),
            onceki: metin("ortak.parca.onceki"),
            sonraki: metin("ortak.parca.sonraki"),
          }}
        >
          <SeritIcerigi>
            {markalar.map((oge) => (
              <SeritOgesi
                key={oge.anahtar}
                className="basis-1/2 tablet:basis-1/4 masaustu:basis-1/6"
              >
                {kutu(oge.marka)}
              </SeritOgesi>
            ))}
          </SeritIcerigi>
          <SeritDugmeleri />
        </Serit>
      ) : (
        <ul className="grid grid-cols-2 gap-4 tablet:grid-cols-3 masaustu:grid-cols-5">
          {markalar.map((oge) => (
            <li key={oge.anahtar} className="min-w-0">
              {kutu(oge.marka)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
