// Kategori kutularının görünüşü (kart 0110; Canlı Çarşı taslağı). Her kutu kategorinin sayfasına gider: kare,
// renkli kutuda görsel (kutunun dörtte üçü), altında adı. Görseli olmayan kategoride yalnız renkli kutu ve ad
// görünür. Bağlamda olmayan (silinmiş, olmayan) kategori çizilmez; hiçbiri kalmazsa bölüm çizilmez.
import Link from "next/link";
import {
  Serit,
  SeritDugmeleri,
  SeritIcerigi,
  SeritOgesi,
} from "../../../../bilesenler/parcalar/serit";
import { sinif } from "../../../../bilesenler/parcalar/sinif";
import { metin } from "../../../metinler/site-metni";
import { BolumGorseli } from "../../bolum-kutuphanesi/gorsel";
import type { BolumGorunumuOzellikleri } from "../../bolum-kutuphanesi/gorunumler";
import { metinMi } from "../ortak/deger";
import { siradakiKutuRengi, zeminSiniflari } from "../ortak/zemin";

export function KategoriKutulariGorunumu({
  gorunum,
  degerler: ham,
  baglam,
}: BolumGorunumuOzellikleri) {
  // Değerler tarifin şemasından geçmiştir (kart 0106); türleri tarifteki alanlardır.
  const degerler = ham as { baslik?: unknown; kategoriler?: unknown };
  const kutular = (
    Array.isArray(degerler.kategoriler)
      ? (degerler.kategoriler as { kategori?: unknown; zemin?: unknown }[])
      : []
  ).flatMap((oge, sira) => {
    // Kimlik tarifin şemasından geçmiştir; bağlamda olmayan kategori silinmiş ya da yoktur.
    const kategori =
      typeof oge.kategori === "string" ? baglam.kategoriler[oge.kategori] : undefined;
    return kategori === undefined
      ? []
      : [
          {
            anahtar: `${sira}`,
            kategori,
            zemin: zeminSiniflari(oge.zemin, siradakiKutuRengi(sira)),
          },
        ];
  });
  if (kutular.length === 0) return null;
  const baslik = metinMi(degerler.baslik) ? degerler.baslik : undefined;
  const kaydirmali = gorunum === "kaydirmali";
  const kutu = ({ kategori, zemin }: (typeof kutular)[number]) => (
    <Link
      href={kategori.adres}
      className="flex min-w-0 flex-col items-center gap-2 text-center font-kalin text-yazi no-underline hover:underline"
    >
      <span
        className={sinif(
          "flex aspect-square w-full items-center justify-center overflow-hidden rounded-orta",
          zemin,
        )}
      >
        <BolumGorseli
          baglam={baglam}
          gorsel={kategori.gorsel}
          genislik="besteBir"
          className="size-3/4 object-contain"
        />
      </span>
      <span className="min-w-0 wrap-anywhere">{kategori.ad}</span>
    </Link>
  );
  return (
    <section
      aria-label={baslik ?? metin("vitrin.bolum.kategoriKutulari.etiket")}
      className="mx-auto flex w-full max-w-icerik flex-col gap-4 px-4 tablet:px-6"
    >
      {baslik === undefined ? null : (
        <h2 className="font-baslik text-baslik-3 font-baslik-kalinligi tablet:text-baslik-2">
          {baslik}
        </h2>
      )}
      {kaydirmali ? (
        <Serit
          metinler={{
            etiket: baslik ?? metin("vitrin.bolum.kategoriKutulari.etiket"),
            seritTanimi: metin("ortak.parca.seritTanimi"),
            ogeTanimi: metin("ortak.parca.seritOgesi"),
            onceki: metin("ortak.parca.onceki"),
            sonraki: metin("ortak.parca.sonraki"),
          }}
        >
          <SeritIcerigi>
            {kutular.map((oge) => (
              <SeritOgesi
                key={oge.anahtar}
                className="basis-1/3 tablet:basis-1/4 masaustu:basis-1/6"
              >
                {kutu(oge)}
              </SeritOgesi>
            ))}
          </SeritIcerigi>
          <SeritDugmeleri />
        </Serit>
      ) : (
        <ul className="grid grid-cols-3 gap-4 masaustu:grid-cols-5">
          {kutular.map((oge) => (
            <li key={oge.anahtar} className="min-w-0">
              {kutu(oge)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
