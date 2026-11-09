// Geri sayımlı fırsatların görünüşü (kart 0111; Canlı Çarşı taslağının "Süreli fırsatlar" bölümü).
// - Yan panelli: zemin renginde panelde üst yazı, başlık ve en yakın bitişe büyük sayaç solda; kartlar
//   sağda. Telefonda panel kartların üstündedir.
// - Panelsiz: başlık ve sayaç üstte, kartlar bütün genişlikte.
// Her kartın üstünde kendi kalan süresi yazar. Kartlar ve bitişler bağlamdaki fırsat kaynağındandır (en yakın
// biten önce); bitiş kartın fiyatındandır (fiyatAraliklari), burada hesaplanmaz. Ürünü olmayan bölüm çizilmez.
import { useId } from "react";
import { sinif } from "../../../../bilesenler/parcalar/sinif";
import { metin } from "../../../metinler/site-metni";
import type { BolumGorunumuOzellikleri } from "../../bolum-kutuphanesi/gorunumler";
import { bolumunUrunKaynaklari } from "../../bolum-kutuphanesi/tarif";
import { metinMi } from "../ortak/deger";
import { bolumunKartGorunumu, kaynaginKartlari, UrunIzgarasi } from "../ortak/urun-izgarasi";
import { zeminSiniflari } from "../ortak/zemin";
import { FirsatOgesi, FirsatSaati, KalanSure, Sayac } from "./sayac";
import { firsatlar } from "./tarif";

export function FirsatlarGorunumu({ gorunum, degerler: ham, baglam }: BolumGorunumuOzellikleri) {
  const baslikKimligi = useId();
  // Değerler tarifin şemasından geçmiştir (kart 0106); türleri tarifteki alanlardır.
  const degerler = ham as Partial<
    Record<"ustYazi" | "baslik" | "adet" | "kartGorunumu" | "zemin", unknown>
  >;
  const [kaynak] = bolumunUrunKaynaklari(firsatlar, degerler);
  const kartlar = kaynaginKartlari(baglam, kaynak).flatMap((kart) => {
    const bitis = kart.fiyat?.indirimBitisi?.getTime();
    return bitis === undefined ? [] : [{ kart, bitis }];
  });
  if (kartlar.length === 0) return null;
  const bitisler = kartlar.map(({ bitis }) => bitis);
  const bitisleri = new Map(kartlar.map(({ kart, bitis }) => [kart.kimlik, bitis]));
  const baslik = metinMi(degerler.baslik)
    ? degerler.baslik
    : metin("vitrin.bolum.firsatlar.etiket");
  const panelli = gorunum === "yan-panelli";
  const zemin = degerler.zemin ?? "birincil";
  const ust = (
    <>
      {metinMi(degerler.ustYazi) ? (
        <p className="font-kalin text-kucuk uppercase">{degerler.ustYazi}</p>
      ) : null}
      <h2
        id={baslikKimligi}
        className="min-w-0 font-baslik text-baslik-3 font-baslik-kalinligi wrap-anywhere tablet:text-baslik-2"
      >
        {baslik}
      </h2>
      <Sayac bitisler={bitisler} />
    </>
  );
  return (
    <FirsatSaati baslangic={baglam.an.getTime()} bitisler={bitisler}>
      <section
        aria-labelledby={baslikKimligi}
        className={sinif(
          "mx-auto flex w-full max-w-icerik flex-col gap-4 px-4 tablet:px-6",
          panelli ? "masaustu:flex-row" : undefined,
        )}
      >
        <div
          className={sinif(
            "flex flex-col gap-4",
            panelli
              ? sinif(
                  "justify-center rounded-orta p-6 masaustu:w-panel masaustu:shrink-0 masaustu:p-8",
                  zeminSiniflari(zemin, "birincil"),
                )
              : undefined,
          )}
        >
          {ust}
        </div>
        <div className="min-w-0 flex-1">
          <UrunIzgarasi
            kartlar={kartlar.map(({ kart }) => kart)}
            kart={bolumunKartGorunumu(baglam, degerler.kartGorunumu)}
            baglam={baglam}
            kaydirmali={false}
            etiket={baslik}
            yer={panelli ? "iki-sutun" : "tam"}
            sarici={(kart, icerik) => {
              const bitis = bitisleri.get(kart.kimlik) ?? 0;
              return (
                <FirsatOgesi bitis={bitis}>
                  <div className="flex h-full flex-col gap-2">
                    <KalanSure bitis={bitis} />
                    {icerik}
                  </div>
                </FirsatOgesi>
              );
            }}
          />
        </div>
      </section>
    </FirsatSaati>
  );
}
