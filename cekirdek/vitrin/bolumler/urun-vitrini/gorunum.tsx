// Ürün vitrininin görünüşü (kart 0111; Canlı Çarşı taslağının "Öne çıkanlar" ve "Yeni gelenler" bölümleri).
// Başlık ve "Tümünü gör" üstte; kartlar ızgarada ya da kaydırmalı şeritte. Yan afiş verilmişse masaüstünde
// kartların solunda, daha dar ekranda üstündedir. Ürünü olmayan bölüm çizilmez.
import { useId } from "react";
import { metin } from "../../../metinler/site-metni";
import type { BolumGorunumuOzellikleri } from "../../bolum-kutuphanesi/gorunumler";
import { metinMi } from "../ortak/deger";
import {
  BolumBasligi,
  bolumunKartGorunumu,
  kaynaginKartlari,
  UrunIzgarasi,
  YanAfis,
} from "../ortak/urun-izgarasi";

export function UrunVitriniGorunumu({ gorunum, degerler: ham, baglam }: BolumGorunumuOzellikleri) {
  const baslikKimligi = useId();
  // Değerler tarifin şemasından geçmiştir (kart 0106); türleri tarifteki alanlardır.
  const degerler = ham as Partial<
    Record<
      | "baslik"
      | "urunler"
      | "tumuBaglantisi"
      | "kartGorunumu"
      | "yanBaslik"
      | "yanMetin"
      | "yanGorsel"
      | "yanGorselMetni"
      | "yanDugmeYazisi"
      | "yanBaglanti"
      | "yanZemin",
      unknown
    >
  >;
  const kartlar = kaynaginKartlari(baglam, degerler.urunler);
  if (kartlar.length === 0) return null;
  const baslik = metinMi(degerler.baslik) ? degerler.baslik : undefined;
  const yanli = metinMi(degerler.yanBaslik);
  // Başlık yoksa ve yan afiş varsa bölümün başlığı yan afişin başlığıdır (Canlı Çarşı taslağı).
  const yanBaslikli = baslik === undefined && yanli;
  return (
    <section
      {...(baslik === undefined && !yanBaslikli
        ? { "aria-label": metin("vitrin.bolum.urunVitrini.etiket") }
        : { "aria-labelledby": baslikKimligi })}
      className="mx-auto flex w-full max-w-icerik flex-col gap-4 px-4 tablet:px-6"
    >
      <BolumBasligi kimlik={baslikKimligi} baslik={baslik} tumu={degerler.tumuBaglantisi} />
      <div className="flex flex-col gap-4 masaustu:flex-row masaustu:items-stretch">
        <YanAfis degerler={degerler} baglam={baglam} {...(yanBaslikli ? { baslikKimligi } : {})} />
        <div className="min-w-0 flex-1">
          <UrunIzgarasi
            kartlar={kartlar}
            kart={bolumunKartGorunumu(baglam, degerler.kartGorunumu)}
            baglam={baglam}
            kaydirmali={gorunum === "kaydirmali"}
            etiket={
              baslik ??
              (yanBaslikli
                ? (degerler.yanBaslik as string)
                : metin("vitrin.bolum.urunVitrini.etiket"))
            }
            yer={yanli ? "yanli" : "tam"}
          />
        </div>
      </div>
    </section>
  );
}
