"use client";
// Ürün sayfasının galerisi (kart 0138, karar 0102 ve 0108; Canlı Çarşı taslağı).
//
// - Görseller kaydırmalı bir şerittir: telefonda parmakla kaydırılır, altında noktalar durur; tablet ve
//   masaüstünde şerit kendisi kaymaz, solda küçük görseller vardır. Şerit odak alır, sol ve sağ ok tuşları
//   önceki ve sonraki öğeye geçer.
// - Görsel ürün görseli ucundan, boyutlarıyla (srcset) gelir; ilk görsel hemen, ötekiler ekrana girince
//   yüklenir.
// - Büyütme düğmesi görseli pencerede en büyük boyutuyla açar; pencerede önceki ve sonraki düğmeleri ve ok
//   tuşları vardır.
// - Video çerezsiz oynatıcıyla ve yalnız müşteri oynata basınca yüklenir (karar 0073): o ana kadar sayfada
//   video sitesine hiçbir istek gitmez.
// - Seçilen birleşimin görseli dışarıdan verilir (aktif); müşteri galeride gezince aktif değişir.
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import { Dugme, IkonDugmesi } from "../../../bilesenler/parcalar/dugme";
import { useHareketAzaltma } from "../../../bilesenler/parcalar/hareket-azaltma";
import {
  Pencere,
  PencereBasligi,
  PencereIcerigi,
  PencereUstu,
} from "../../../bilesenler/parcalar/pencere";
import { sinif } from "../../../bilesenler/parcalar/sinif";
import { useMetin } from "../../metinler/istemci-metni";
import { doldur } from "../../moduller/eposta/sablon";
import type { SayfaGaleriOgesi, SayfaGorseli } from "./veri";

// Tarayıcının yere göre boyut seçimi: telefonda tam genişlik, tablet ve üstünde sayfanın yarısı kadar.
const gorselBoyutlari = "(min-width: 40rem) 50vw, 100vw";

const srcset = (gorsel: SayfaGorseli) =>
  gorsel.kaynaklar.map((kaynak) => `${kaynak.adres} ${kaynak.genislik}w`).join(", ");

function Gorsel({
  gorsel,
  oncelikli,
  boyutlar,
}: {
  gorsel: SayfaGorseli;
  oncelikli: boolean;
  boyutlar: string;
}) {
  return (
    // biome-ignore lint/performance/noImgElement: görsel ürün görseli ucundan boyutlarıyla gelir (karar 0073).
    <img
      src={gorsel.kaynaklar.at(-1)?.adres}
      srcSet={srcset(gorsel)}
      sizes={boyutlar}
      alt={gorsel.alternatifMetin}
      width={gorsel.genislik}
      height={gorsel.yukseklik}
      loading={oncelikli ? "eager" : "lazy"}
      decoding="async"
      className="size-7/8 object-contain"
    />
  );
}

function Video({ oge }: { oge: Extract<SayfaGaleriOgesi, { tur: "video" }> }) {
  const metin = useMetin();
  const [oynuyor, setOynuyor] = useState(false);
  if (oynuyor) {
    const adres = new URL(oge.oynatici);
    adres.searchParams.set("autoplay", "1");
    return (
      <iframe
        src={adres.toString()}
        title={oge.alternatifMetin}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        className="size-full border-0"
      />
    );
  }
  return (
    <div className="flex size-full flex-col items-center justify-center gap-3 bg-yazi p-4 text-center text-kucuk text-zemin">
      <Dugme
        tur="sade"
        onClick={() => setOynuyor(true)}
        className="size-16 rounded-dugme bg-zemin px-0 text-yazi hover:bg-yuzey"
        aria-label={doldur(metin("vitrin.urunSayfasi.videoyuOynat"), { ad: oge.alternatifMetin })}
      >
        <Ikon ad="baslat" className="size-6" />
      </Dugme>
      <span>{metin("vitrin.urunSayfasi.videoNotu")}</span>
    </div>
  );
}

export function UrunGalerisi({
  ogeler,
  aktif,
  onAktifDegisti,
  urunAdi,
}: {
  ogeler: readonly SayfaGaleriOgesi[];
  aktif: number;
  onAktifDegisti: (sira: number) => void;
  urunAdi: string;
}) {
  const metin = useMetin();
  const serit = useRef<HTMLElement>(null);
  const hareketAzaltma = useHareketAzaltma();
  const [buyuk, setBuyuk] = useState<number | undefined>(undefined);
  // Pencere kapanınca odak büyütme düğmesine döner (pencerenin tetikleyicisi yoktur, açılışı denetlenir).
  const buyukKutu = useRef<HTMLDivElement>(null);
  // Kaydırma ile gelen değişiklik şeridi yeniden kaydırmasın.
  const kaydirmadanGelen = useRef(false);
  // İlk açılışta gösterilen öğe (seçili birleşimin görseli olabilir): hemen yüklenen odur, ötekiler ekrana
  // girince. Şerit sunucuda ilk öğede çizilir; sayfa bağlanınca bu öğeye kaydırmasız (anında) gider.
  const [ilkAktif] = useState(aktif);
  const ilkKonum = useRef(true);

  // Aktif öğe değişince şerit o öğeye gider (küçük görsel, ok tuşu ya da seçilen birleşimin görseli).
  useEffect(() => {
    const kutu = serit.current;
    if (kutu === null) return;
    if (kaydirmadanGelen.current) {
      kaydirmadanGelen.current = false;
      return;
    }
    const anlik = ilkKonum.current;
    ilkKonum.current = false;
    if (anlik && aktif === 0) return;
    kutu.scrollTo({
      left: aktif * kutu.clientWidth,
      behavior: hareketAzaltma || anlik ? "auto" : "smooth",
    });
  }, [aktif, hareketAzaltma]);

  if (ogeler.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-orta bg-yuzey text-soluk-yazi">
        <Ikon ad="gorsel" className="size-12" />
      </div>
    );
  }

  const git = (sira: number) => onAktifDegisti((sira + ogeler.length) % ogeler.length);
  const okTusu = (olay: KeyboardEvent, gec: (yon: -1 | 1) => void) => {
    if (olay.key === "ArrowLeft" || olay.key === "ArrowRight") {
      olay.preventDefault();
      gec(olay.key === "ArrowLeft" ? -1 : 1);
    }
  };
  const aktifOge = ogeler[aktif];
  const buyukOge = buyuk === undefined ? undefined : ogeler[buyuk];
  // Pencerede yalnız görseller gezilir; sondan başa döner.
  const gorselSiralari = ogeler.flatMap((oge, sira) => (oge.tur === "gorsel" ? [sira] : []));
  const buyukGec = (yon: -1 | 1) => {
    const yer = gorselSiralari.indexOf(buyuk ?? -1);
    const sonraki = gorselSiralari[(yer + yon + gorselSiralari.length) % gorselSiralari.length];
    if (sonraki !== undefined) setBuyuk(sonraki);
  };

  return (
    <div
      data-slot="urun-galerisi"
      className="flex min-w-0 flex-col gap-2 tablet:flex-row-reverse tablet:gap-3"
    >
      <div ref={buyukKutu} className="relative min-w-0 flex-1">
        <section
          ref={serit}
          aria-roledescription={metin("vitrin.urunSayfasi.galeriTanimi")}
          aria-label={doldur(metin("vitrin.urunSayfasi.galeri"), {
            sira: String(aktif + 1),
            toplam: String(ogeler.length),
          })}
          // biome-ignore lint/a11y/noNoninteractiveTabindex: kaydırılan şerit klavyeyle gezilir (ok tuşları), kaydırılan bölge odak almalıdır (WCAG 2.1.1).
          tabIndex={0}
          onKeyDown={(olay) => okTusu(olay, (yon) => git(aktif + yon))}
          onScroll={(olay) => {
            const kutu = olay.currentTarget;
            const sira = Math.round(kutu.scrollLeft / Math.max(kutu.clientWidth, 1));
            if (sira !== aktif && sira >= 0 && sira < ogeler.length) {
              kaydirmadanGelen.current = true;
              onAktifDegisti(sira);
            }
          }}
          className="flex snap-x snap-mandatory overflow-x-auto rounded-orta tablet:overflow-x-hidden"
        >
          {ogeler.map((oge, sira) => (
            <div
              key={oge.kimlik}
              className="flex aspect-square w-full shrink-0 snap-center items-center justify-center overflow-hidden bg-yuzey"
              {...(sira === aktif ? {} : { inert: true })}
            >
              {oge.tur === "gorsel" ? (
                <Gorsel gorsel={oge} oncelikli={sira === ilkAktif} boyutlar={gorselBoyutlari} />
              ) : (
                <Video oge={oge} />
              )}
            </div>
          ))}
        </section>
        {aktifOge?.tur === "gorsel" ? (
          <IkonDugmesi
            ikon="arama"
            etiket={metin("vitrin.urunSayfasi.buyut")}
            data-buyut=""
            onClick={() => setBuyuk(aktif)}
            className="absolute top-2 right-2 rounded-dugme bg-zemin"
          />
        ) : null}
        {ogeler.length > 1 ? (
          <div className="flex justify-center tablet:hidden" aria-hidden="true">
            {ogeler.map((oge, sira) => (
              <span key={oge.kimlik} className="flex size-6 items-center justify-center">
                <span
                  className={sinif(
                    "size-2 rounded-dugme border border-yazi",
                    sira === aktif && "bg-yazi",
                  )}
                />
              </span>
            ))}
          </div>
        ) : null}
      </div>
      {ogeler.length > 1 ? (
        <ul className="hidden shrink-0 flex-col gap-2 tablet:flex">
          {ogeler.map((oge, sira) => (
            <li key={oge.kimlik}>
              <Dugme
                tur="sade"
                aria-current={sira === aktif}
                aria-label={doldur(metin("vitrin.urunSayfasi.kucukGorsel"), {
                  sira: String(sira + 1),
                  ad: oge.alternatifMetin,
                })}
                onClick={() => git(sira)}
                className={sinif(
                  "relative size-16 overflow-hidden rounded-kucuk border border-kenar bg-yuzey px-0",
                  sira === aktif && "border-2 border-yazi",
                )}
              >
                {oge.tur === "gorsel" ? (
                  // biome-ignore lint/performance/noImgElement: küçük görsel ürün görseli ucundan gelir.
                  <img
                    src={oge.kucuk}
                    alt=""
                    width={oge.genislik}
                    height={oge.yukseklik}
                    loading="lazy"
                    className="size-7/8 object-contain"
                  />
                ) : (
                  <span className="flex size-8 items-center justify-center rounded-dugme bg-yazi text-zemin">
                    <Ikon ad="baslat" className="size-4" />
                  </span>
                )}
              </Dugme>
            </li>
          ))}
        </ul>
      ) : null}
      <Pencere open={buyukOge !== undefined} onOpenChange={(acik) => !acik && setBuyuk(undefined)}>
        {buyukOge?.tur === "gorsel" ? (
          <PencereIcerigi
            kapatEtiketi={metin("ortak.parca.kapat")}
            genislik="genis"
            aria-describedby={undefined}
            onKeyDown={(olay) => okTusu(olay, buyukGec)}
            onCloseAutoFocus={(olay) => {
              olay.preventDefault();
              buyukKutu.current?.querySelector<HTMLButtonElement>("[data-buyut]")?.focus();
            }}
          >
            <PencereUstu>
              <PencereBasligi>{urunAdi}</PencereBasligi>
            </PencereUstu>
            <div className="flex min-h-0 flex-1 items-center justify-center bg-yuzey">
              <Gorsel gorsel={buyukOge} oncelikli boyutlar="100vw" />
            </div>
            {gorselSiralari.length > 1 ? (
              <div className="flex justify-center gap-2">
                <IkonDugmesi
                  ikon="onceki"
                  tur="cerceveli"
                  etiket={metin("vitrin.urunSayfasi.oncekiGorsel")}
                  onClick={() => buyukGec(-1)}
                />
                <IkonDugmesi
                  ikon="sonraki"
                  tur="cerceveli"
                  etiket={metin("vitrin.urunSayfasi.sonrakiGorsel")}
                  onClick={() => buyukGec(1)}
                />
              </div>
            ) : null}
          </PencereIcerigi>
        ) : null}
      </Pencere>
    </div>
  );
}
