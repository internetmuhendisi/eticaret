// Müşteri yorumlarının görünüşü (kart 0112; Canlı Çarşı taslağının "Müşterilerimiz ne diyor" bölümü). Her yorum
// yüzey renginde köşeli bir kartta: beş yıldızlı puan, yorum (alıntı) ve müşterinin adı, adın baş harfi dairede.
// Yorumlar bağlamdaki kaynaktan gelir (islev-verisi.ts); yorumu olmayan bölüm çizilmez.
import { useId } from "react";
import {
  Serit,
  SeritDugmeleri,
  SeritIcerigi,
  SeritOgesi,
} from "../../../../bilesenler/parcalar/serit";
import { doldur } from "../../../metinler/doldur";
import { bicim, metin } from "../../../metinler/site-metni";
import type { VitrinBaglami } from "../../bolum-kutuphanesi/baglam";
import type { BolumGorunumuOzellikleri } from "../../bolum-kutuphanesi/gorunumler";
import {
  type BaglamYorumu,
  yorumKaynagiAnahtari,
  yorumKaynakTurleri,
} from "../../bolum-kutuphanesi/islev-verisi";
import type { BolumDegerleri } from "../../bolum-kutuphanesi/tarif";
import { secimDegeri } from "../../bolum-kutuphanesi/tarif";
import { Yildizlar, yildizSayisi } from "../../yildizlar";
import { metinMi } from "../ortak/deger";
import { BolumBasligi } from "../ortak/urun-izgarasi";
import { musteriYorumlari, yorumAdetleri } from "./tarif";

// Seçilen kaynağın yorumları, adet kadar. Panel de bölümün boş olup olmadığını bununla bulur (kart 0172).
export const musteriYorumlariYorumlari = (ham: BolumDegerleri, baglam: VitrinBaglami) => {
  const degerler = ham as Partial<Record<"kaynak" | "adet", unknown>>;
  const kaynakTuru = secimDegeri(musteriYorumlari.alanlar.kaynak, degerler.kaynak);
  const adet =
    yorumAdetleri[
      secimDegeri(musteriYorumlari.alanlar.adet, degerler.adet) as keyof typeof yorumAdetleri
    ];
  const tur = yorumKaynakTurleri.find((kod) => kod === kaynakTuru) ?? yorumKaynakTurleri[0];
  return (baglam.yorumlar[yorumKaynagiAnahtari({ tur, adet })] ?? []).slice(0, adet);
};

export function MusteriYorumlariGorunumu({
  gorunum,
  degerler: ham,
  baglam,
}: BolumGorunumuOzellikleri) {
  const baslikKimligi = useId();
  // Değerler tarifin şemasından geçmiştir (kart 0106); türleri tarifteki alanlardır.
  const degerler = ham as Partial<Record<"baslik" | "kaynak" | "adet", unknown>>;
  const yorumlar = musteriYorumlariYorumlari(ham, baglam);
  if (yorumlar.length === 0) return null;
  const baslik = metinMi(degerler.baslik) ? degerler.baslik : undefined;
  const etiket = baslik ?? metin("vitrin.bolum.musteriYorumlari.etiket");
  const kart = (yorum: BaglamYorumu) => {
    // Puan 1–5 tam sayıdır; bozuk değer (NaN) en düşük puan sayılır, "NaN puan" okunmaz.
    const puan = Number.isFinite(yorum.puan)
      ? Math.min(Math.max(Math.round(yorum.puan), 1), yildizSayisi)
      : 1;
    return (
      <figure className="relative m-0 flex h-full flex-col gap-3 rounded-orta bg-yuzey p-6 text-yazi">
        <span className="text-yazi">
          <Yildizlar
            dolu={puan}
            boyut="orta"
            yazi={doldur(metin("vitrin.bolum.musteriYorumlari.puan"), {
              puan: bicim().sayi(puan),
              enCok: bicim().sayi(yildizSayisi),
            })}
          />
        </span>
        <blockquote className="m-0 text-orta whitespace-pre-line wrap-anywhere">
          {yorum.metin}
        </blockquote>
        <figcaption className="mt-auto flex items-center gap-3 font-kalin">
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-dugme bg-kenar"
          >
            {yorum.ad.slice(0, 1)}
          </span>
          <span className="min-w-0 wrap-anywhere">{yorum.ad}</span>
        </figcaption>
      </figure>
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
            {yorumlar.map((yorum) => (
              <SeritOgesi
                key={yorum.kimlik}
                className="basis-5/6 tablet:basis-1/2 masaustu:basis-1/3"
              >
                {kart(yorum)}
              </SeritOgesi>
            ))}
          </SeritIcerigi>
          <SeritDugmeleri />
        </Serit>
      ) : (
        <ul className="grid grid-cols-1 gap-4 tablet:grid-cols-2 masaustu:grid-cols-3">
          {yorumlar.map((yorum) => (
            <li key={yorum.kimlik} className="min-w-0">
              {kart(yorum)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
