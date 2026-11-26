"use client";
// Sepetin tutar özeti (kart 0212'den ayrıldı, kart 0329): ara toplam, kupon satırı, kargo, vergi ve toplam. Sepet
// sayfası, ödeme adımı, sipariş alındı ve siparişin ayrıntısı aynı özeti çizer (sipariş sayfaları saklanan tutarlarla).
// Kupon geçmeme nedeninin yazısı da buradadır (sepetin kutusu ve ödeme adımı).
import { sinif } from "../../../bilesenler/parcalar/sinif";
import { doldur } from "../../metinler/doldur";
import { useMetin } from "../../metinler/istemci-metni";
import type { Metin } from "./satir-parcalari";
import type { SepetGorunumu, SepetGorunumuKuponu } from "./veri";

function OzetSatiri({ ad, deger, vurgu = false }: { ad: string; deger: string; vurgu?: boolean }) {
  return (
    <div
      className={sinif(
        "flex justify-between gap-3",
        vurgu ? "border-t border-kenar pt-3 text-buyuk font-en-kalin" : "text-govde",
      )}
    >
      <dt>{ad}</dt>
      <dd className="whitespace-nowrap">{deger}</dd>
    </div>
  );
}

// Sipariş alındı sayfası da aynı özeti siparişin saklanan tutarlarıyla çizer (kart 0214).
export type OzetTutarlari = Pick<
  SepetGorunumu,
  "adet" | "kargo" | "gosterim" | "vergiDokumu" | "yazili"
> & { kupon?: SepetGorunumuKuponu | undefined };

// Kupon geçmeme nedeninin yazısı (sepetin kutusu ve ödeme adımı).
export const kuponNedeni = (
  metin: Metin,
  kupon: { kod: string; neden: Extract<SepetGorunumuKuponu, { durum: "gecmedi" }>["neden"] },
  kalan?: string,
) =>
  doldur(metin(`vitrin.sepet.kupon.neden.${kupon.neden}`), { kod: kupon.kod, kalan: kalan ?? "" });

export function SepetOzeti({ gorunum }: { gorunum: OzetTutarlari }) {
  const metin = useMetin();
  const vergiAdi = (ad?: string) => ad ?? metin("vitrin.sepet.vergiAdsiz");
  return (
    <dl className="flex flex-col gap-3">
      <OzetSatiri
        ad={doldur(metin("vitrin.sepet.araToplam"), { sayi: String(gorunum.adet) })}
        deger={gorunum.yazili.araToplam}
      />
      {gorunum.kupon?.durum === "uygulandi" ? (
        <div className="flex justify-between gap-3 text-govde font-kalin text-basari-yazi">
          <dt>{doldur(metin("vitrin.sepet.kupon.ozet"), { kod: gorunum.kupon.kod })}</dt>
          <dd className="whitespace-nowrap">
            {gorunum.kupon.tur === "ucretsiz-kargo"
              ? metin("vitrin.sepet.kupon.ucretsizKargo")
              : doldur(metin("vitrin.sepet.kupon.indirim"), {
                  tutar: gorunum.kupon.yaziliIndirim,
                })}
          </dd>
        </div>
      ) : null}
      {gorunum.kargo === "yok" ? null : (
        <OzetSatiri
          ad={metin("vitrin.sepet.kargo")}
          deger={gorunum.yazili.kargo ?? metin("vitrin.sepet.kargoUcretsiz")}
        />
      )}
      {gorunum.gosterim === "vergi-haric"
        ? gorunum.vergiDokumu.map((satir) => (
            <OzetSatiri
              key={`${satir.ad}-${satir.oran}`}
              ad={doldur(metin("vitrin.sepet.vergi"), {
                vergi: vergiAdi(satir.ad),
                oran: satir.oran,
              })}
              deger={satir.yazili}
            />
          ))
        : null}
      <OzetSatiri ad={metin("vitrin.sepet.toplam")} deger={gorunum.yazili.toplam} vurgu />
      {gorunum.gosterim === "vergi-dahil"
        ? gorunum.vergiDokumu.map((satir) => (
            <div
              key={`${satir.ad}-${satir.oran}`}
              className="flex justify-between gap-3 text-kucuk text-soluk-yazi"
            >
              <dt>
                {doldur(metin("vitrin.sepet.vergiDahil"), {
                  vergi: vergiAdi(satir.ad),
                  oran: satir.oran,
                })}
              </dt>
              <dd className="whitespace-nowrap">{satir.yazili}</dd>
            </div>
          ))
        : null}
    </dl>
  );
}
