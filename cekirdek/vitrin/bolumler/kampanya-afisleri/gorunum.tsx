// Kampanya afişlerinin görünüşü (kart 0110; Canlı Çarşı taslağı). Masaüstünde afiş sayısı kadar sütun, telefonda
// alt alta. Bağlantısı olan afişin başlığı bağlantıdır ve afişin tamamına yayılır (kart 0109'daki ürün
// kartıyla aynı yol); düğme yazısı afişin altında altı çizili durur. Afişin başlığı h2'dir (bölüm başlıkları h2,
// kart 0110 kontrolü).
//
// "Görsel solda" (taslağın ikili tanıtımları, karar 0093): afiş yüzey renginde bir karttır; görsel solda
// afişin renginde kendi alanında, yazı sağda, düğme yazısı çerçeveli düğme gibi durur. Masaüstünde iki sütun,
// tablette tek sütunda görsel ve yazı yan yana, telefonda görsel üstte.
import Link from "next/link";
import { dugmeSiniflari } from "../../../../bilesenler/parcalar/dugme";
import { Rozet } from "../../../../bilesenler/parcalar/rozet";
import { sinif } from "../../../../bilesenler/parcalar/sinif";
import { yaziCiftleri } from "../../../../bilesenler/tasarim-degerleri/degerler";
import { metin } from "../../../metinler/site-metni";
import { BolumGorseli } from "../../bolum-kutuphanesi/gorsel";
import type { BolumGorunumuOzellikleri } from "../../bolum-kutuphanesi/gorunumler";
import { baglantiMi, metinMi } from "../ortak/deger";
import { kartBaglantisi } from "../ortak/kart-baglantisi";
import { yeniSekmeOzellikleri } from "../ortak/menu";
import { siradakiKutuRengi, zeminSiniflari } from "../ortak/zemin";

type Afis = {
  gorsel?: unknown;
  gorselMetni?: unknown;
  rozet?: unknown;
  baslik?: unknown;
  metin?: unknown;
  dugmeYazisi?: unknown;
  baglanti?: unknown;
  zemin?: unknown;
};

export function KampanyaAfisleriGorunumu({
  gorunum,
  degerler: ham,
  baglam,
}: BolumGorunumuOzellikleri) {
  // Değerler tarifin şemasından geçmiştir (kart 0106); türleri tarifteki alanlardır.
  const degerler = ham as { afisler?: unknown };
  const afisler = (Array.isArray(degerler.afisler) ? (degerler.afisler as Afis[]) : []).filter(
    (afis) => metinMi(afis.baslik),
  );
  if (afisler.length === 0) return null;
  if (gorunum === "gorsel-solda") return <GorselSoldaAfisler afisler={afisler} baglam={baglam} />;
  const dikey = gorunum === "dikey";
  return (
    <section
      aria-label={metin("vitrin.bolum.kampanyaAfisleri.etiket")}
      className="mx-auto w-full max-w-icerik px-4 tablet:px-6"
    >
      <ul
        className={sinif(
          "grid grid-cols-1 gap-4",
          afisler.length === 2 ? "tablet:grid-cols-2" : "tablet:grid-cols-2 masaustu:grid-cols-3",
        )}
      >
        {afisler.map((afis, sira) => {
          const baglanti = baglantiMi(afis.baglanti) ? afis.baglanti : undefined;
          const baslik = afis.baslik as string;
          return (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: afişlerin kimliği yoktur, sıraları değerdedir.
              key={sira}
              className={sinif(
                "relative flex min-w-0 gap-3 overflow-hidden rounded-orta p-6",
                dikey ? "flex-col" : "items-center",
                zeminSiniflari(afis.zemin, siradakiKutuRengi(sira)),
              )}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                {metinMi(afis.rozet) ? (
                  <Rozet tur="koyu" className="whitespace-normal">
                    {afis.rozet}
                  </Rozet>
                ) : null}
                <h2 className="min-w-0 font-baslik text-baslik-4 font-baslik-kalinligi wrap-anywhere">
                  {baglanti === undefined ? (
                    baslik
                  ) : (
                    <Link
                      href={baglanti.adres}
                      className={kartBaglantisi}
                      {...yeniSekmeOzellikleri(baglanti.yeniSekme)}
                    >
                      {baslik}
                    </Link>
                  )}
                </h2>
                {metinMi(afis.metin) ? <p className="whitespace-pre-line">{afis.metin}</p> : null}
                {baglanti !== undefined && metinMi(afis.dugmeYazisi) ? (
                  <span
                    aria-hidden="true"
                    className="text-kucuk font-en-kalin underline underline-offset-2"
                  >
                    {afis.dugmeYazisi}
                  </span>
                ) : null}
              </div>
              <BolumGorseli
                baglam={baglam}
                gorsel={afis.gorsel}
                alternatifMetin={afis.gorselMetni}
                genislik="besteBir"
                className={sinif(
                  "aspect-square shrink-0 object-contain",
                  dikey ? "order-first w-full max-w-karekod self-center" : "w-2/5",
                )}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// Kartın odak çerçevesi kartın yazı renginde, görselin alanının da üstünden geçer (kart-baglantisi.ts). Bu yüzden
// görselin alanı yalnız üstünde yazı renginin okunduğu ölçülmüş bir zemin alır (yaziCiftleri); öteki seçim
// (bugün afiş rengi: bir temada yazıyla aynı renktir) sıradaki kutu rengine düşer.
const gorselAlaniRengi = (zemin: unknown, sira: number): unknown =>
  yaziCiftleri.some(([on, arka]) => on === "yazi" && arka === zemin)
    ? zemin
    : siradakiKutuRengi(sira);

function GorselSoldaAfisler({
  afisler,
  baglam,
}: {
  afisler: Afis[];
  baglam: BolumGorunumuOzellikleri["baglam"];
}) {
  return (
    <section
      aria-label={metin("vitrin.bolum.kampanyaAfisleri.etiket")}
      className="mx-auto w-full max-w-icerik px-4 tablet:px-6"
    >
      <ul className="grid grid-cols-1 gap-4 masaustu:grid-cols-2">
        {afisler.map((afis, sira) => {
          const baglanti = baglantiMi(afis.baglanti) ? afis.baglanti : undefined;
          const baslik = afis.baslik as string;
          // Görseli olmayan (ya da bağlamda bulunmayan) afişte renkli alan çizilmez, yazı kartın tamamındadır.
          const gorselli = typeof afis.gorsel === "string" && afis.gorsel in baglam.gorseller;
          return (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: afişlerin kimliği yoktur, sıraları değerdedir.
              key={sira}
              className={sinif(
                "relative grid min-w-0 grid-cols-1 overflow-hidden rounded-orta bg-yuzey text-yazi",
                gorselli && "tablet:grid-cols-2",
              )}
            >
              {gorselli ? (
                <div
                  className={sinif(
                    "flex min-w-0 items-center justify-center p-6",
                    // Görselin alanında odaklanan öğe yoktur: renkli zeminin odak kuralı gerekmez.
                    zeminSiniflari(gorselAlaniRengi(afis.zemin, sira), siradakiKutuRengi(sira), {
                      odak: false,
                    }),
                  )}
                >
                  <BolumGorseli
                    baglam={baglam}
                    gorsel={afis.gorsel}
                    alternatifMetin={afis.gorselMetni}
                    genislik="besteBir"
                    className="aspect-square w-4/5 max-w-karekod object-contain"
                  />
                </div>
              ) : null}
              <div className="flex min-w-0 flex-col justify-center gap-3 p-6">
                {metinMi(afis.rozet) ? (
                  <Rozet tur="koyu" className="whitespace-normal">
                    {afis.rozet}
                  </Rozet>
                ) : null}
                <h2 className="min-w-0 font-baslik text-baslik-3 font-baslik-kalinligi wrap-anywhere">
                  {baglanti === undefined ? (
                    baslik
                  ) : (
                    <Link
                      href={baglanti.adres}
                      className={kartBaglantisi}
                      {...yeniSekmeOzellikleri(baglanti.yeniSekme)}
                    >
                      {baslik}
                    </Link>
                  )}
                </h2>
                {metinMi(afis.metin) ? (
                  <p className="whitespace-pre-line text-soluk-yazi">{afis.metin}</p>
                ) : null}
                {baglanti !== undefined && metinMi(afis.dugmeYazisi) ? (
                  <span
                    aria-hidden="true"
                    className={sinif(dugmeSiniflari({ tur: "cerceveli" }), "w-fit")}
                  >
                    {afis.dugmeYazisi}
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
