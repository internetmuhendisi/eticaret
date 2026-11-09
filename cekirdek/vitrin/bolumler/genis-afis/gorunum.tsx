// Geniş afişin görünüşü (kart 0110; Canlı Çarşı taslağı). Yan yana: yazı solda, görsel sağda, zemin renginde
// köşeli kutu (varsayılan zemin alt kısım rengi); telefonda alt alta. Tam genişlik: görsel içerik genişliğinde,
// yazı ve düğme onun üstünde zemin renginde bir kutuda. Bağlantılı afişte başlığın bağlantısı afişin tamamına
// yayılır; düğme yazısı afişte düğme gibi görünür.
import Link from "next/link";
import { dugmeSiniflari } from "../../../../bilesenler/parcalar/dugme";
import { Rozet } from "../../../../bilesenler/parcalar/rozet";
import { sinif } from "../../../../bilesenler/parcalar/sinif";
import { BolumGorseli } from "../../bolum-kutuphanesi/gorsel";
import type { BolumGorunumuOzellikleri } from "../../bolum-kutuphanesi/gorunumler";
import { baglantiMi, metinMi } from "../ortak/deger";
import { kartBaglantisi } from "../ortak/kart-baglantisi";
import { yeniSekmeOzellikleri } from "../ortak/menu";
import { solukYaziSiniflari, zeminSiniflari } from "../ortak/zemin";

export function GenisAfisGorunumu({ gorunum, degerler: ham, baglam }: BolumGorunumuOzellikleri) {
  // Değerler tarifin şemasından geçmiştir (kart 0106); türleri tarifteki alanlardır.
  const degerler = ham as {
    gorsel?: unknown;
    gorselMetni?: unknown;
    ustYazi?: unknown;
    baslik?: unknown;
    metin?: unknown;
    dugmeYazisi?: unknown;
    baglanti?: unknown;
    zemin?: unknown;
  };
  if (!metinMi(degerler.baslik)) return null;
  const baglanti = baglantiMi(degerler.baglanti) ? degerler.baglanti : undefined;
  const tam = gorunum === "tam-genislik";
  const zemin = degerler.zemin ?? "alt-kisim";
  const yazi = (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      {metinMi(degerler.ustYazi) ? (
        <Rozet className="whitespace-normal">{degerler.ustYazi}</Rozet>
      ) : null}
      <h2 className="font-baslik text-baslik-2 font-baslik-kalinligi tablet:text-baslik-1">
        {baglanti === undefined ? (
          degerler.baslik
        ) : (
          <Link
            href={baglanti.adres}
            className={kartBaglantisi}
            {...yeniSekmeOzellikleri(baglanti.yeniSekme)}
          >
            {degerler.baslik}
          </Link>
        )}
      </h2>
      {metinMi(degerler.metin) ? (
        <p className={sinif("text-orta whitespace-pre-line", solukYaziSiniflari(zemin))}>
          {degerler.metin}
        </p>
      ) : null}
      {baglanti !== undefined && metinMi(degerler.dugmeYazisi) ? (
        <span aria-hidden="true" className={sinif(dugmeSiniflari({ tur: "birincil" }), "w-fit")}>
          {degerler.dugmeYazisi}
        </span>
      ) : null}
    </div>
  );
  return (
    <section className="mx-auto w-full max-w-icerik px-4 tablet:px-6">
      {tam ? (
        <div className="relative grid items-end overflow-hidden rounded-orta">
          <div className="col-start-1 row-start-1">
            <BolumGorseli
              baglam={baglam}
              gorsel={degerler.gorsel}
              alternatifMetin={degerler.gorselMetni}
              genislik="tam"
              className="aspect-4/3 w-full object-cover tablet:aspect-3/1"
            />
          </div>
          <div
            className={sinif(
              // Telefonda yazı görselin altında, daha geniş ekranda görselin üstündedir.
              "col-start-1 row-start-2 mt-4 flex max-w-form rounded-orta p-6 tablet:row-start-1 tablet:m-8",
              zeminSiniflari(zemin, "alt-kisim"),
            )}
          >
            {yazi}
          </div>
        </div>
      ) : (
        <div
          className={sinif(
            "relative flex flex-col gap-6 overflow-hidden rounded-orta p-6 tablet:flex-row tablet:items-center tablet:p-8",
            zeminSiniflari(zemin, "alt-kisim"),
          )}
        >
          {yazi}
          <BolumGorseli
            baglam={baglam}
            gorsel={degerler.gorsel}
            alternatifMetin={degerler.gorselMetni}
            genislik="ucteBir"
            className="aspect-square w-full max-w-karekod shrink-0 self-center object-contain"
          />
        </div>
      )}
    </section>
  );
}
