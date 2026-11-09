// Sekmeli vitrinin görünüşü (kart 0111; Canlı Çarşı taslağının "Kategoriye göre" bölümü). Başlığın yanında
// sekmeler (ortak Sekmeler parçası: ok tuşları sekmeler arasında gezer, Tab ürünlere geçer); seçili sekmenin
// ürünleri ızgarada ya da kaydırmalı şeritte. Ürünü olmayan sekme görünmez; tek sekme kalırsa sekme çizilmez,
// başlığı bölümün başlığı olur. Hiçbir sekmenin ürünü yoksa bölüm çizilmez.
import { useId } from "react";
import {
  Sekme,
  SekmeIcerigi,
  SekmeListesi,
  Sekmeler,
} from "../../../../bilesenler/parcalar/sekmeler";
import { metin } from "../../../metinler/site-metni";
import type { BolumGorunumuOzellikleri } from "../../bolum-kutuphanesi/gorunumler";
import { metinMi } from "../ortak/deger";
import {
  BolumBasligi,
  bolumunKartGorunumu,
  kaynaginKartlari,
  UrunIzgarasi,
} from "../ortak/urun-izgarasi";

export function SekmeliVitrinGorunumu({
  gorunum,
  degerler: ham,
  baglam,
}: BolumGorunumuOzellikleri) {
  const baslikKimligi = useId();
  // Değerler tarifin şemasından geçmiştir (kart 0106); türleri tarifteki alanlardır.
  const degerler = ham as { baslik?: unknown; sekmeler?: unknown; kartGorunumu?: unknown };
  const sekmeler = (
    Array.isArray(degerler.sekmeler)
      ? (degerler.sekmeler as { baslik?: unknown; urunler?: unknown }[])
      : []
  ).flatMap((sekme, sira) => {
    const kartlar = kaynaginKartlari(baglam, sekme.urunler);
    return metinMi(sekme.baslik) && kartlar.length > 0
      ? [{ kod: String(sira), baslik: sekme.baslik, kartlar }]
      : [];
  });
  const [ilk] = sekmeler;
  if (ilk === undefined) return null;
  const bolumBasligi = metinMi(degerler.baslik) ? degerler.baslik : undefined;
  const etiket = bolumBasligi ?? metin("vitrin.bolum.sekmeliVitrin.etiket");
  const kart = bolumunKartGorunumu(baglam, degerler.kartGorunumu);
  const kaydirmali = gorunum === "kaydirmali";
  const izgara = (sekme: (typeof sekmeler)[number]) => (
    <UrunIzgarasi
      kartlar={sekme.kartlar}
      kart={kart}
      baglam={baglam}
      kaydirmali={kaydirmali}
      etiket={sekme.baslik}
    />
  );
  return (
    <section
      aria-labelledby={
        sekmeler.length === 1 || bolumBasligi !== undefined ? baslikKimligi : undefined
      }
      {...(sekmeler.length > 1 && bolumBasligi === undefined ? { "aria-label": etiket } : {})}
      className="mx-auto flex w-full max-w-icerik flex-col gap-4 px-4 tablet:px-6"
    >
      {sekmeler.length === 1 ? (
        <>
          <BolumBasligi kimlik={baslikKimligi} baslik={bolumBasligi ?? ilk.baslik} />
          {izgara(ilk)}
        </>
      ) : (
        <Sekmeler defaultValue={ilk.kod}>
          <BolumBasligi kimlik={baslikKimligi} baslik={bolumBasligi}>
            <SekmeListesi aria-label={etiket}>
              {sekmeler.map((sekme) => (
                <Sekme key={sekme.kod} value={sekme.kod}>
                  {sekme.baslik}
                </Sekme>
              ))}
            </SekmeListesi>
          </BolumBasligi>
          {sekmeler.map((sekme) => (
            <SekmeIcerigi key={sekme.kod} value={sekme.kod}>
              {izgara(sekme)}
            </SekmeIcerigi>
          ))}
        </Sekmeler>
      )}
    </section>
  );
}
