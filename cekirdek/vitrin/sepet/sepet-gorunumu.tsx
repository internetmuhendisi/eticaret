"use client";
// Sepetin görünüşü (kart 0212, karar 0135; kart 0211'in taslağı): sepet sayfası ve sepet penceresi. Veri sunucuda
// hesaplanmış gelir (useSepetGorunumu, veri.ts); burada hesap yapılmaz, yalnız yazılır.
//
// - Satır: görsel, ad (ürün sayfasına bağlantı), seçim, birim fiyatı (fiyat bileşeni), uyarılar, adet seçici, satır
//   tutarı ve "Sepetten çıkar". Satılamayan satırın adedi değişmez, tutarı yoktur, yalnız çıkarılır.
// - Uyarılar yazıyla ve ikonla verilir, yalnız renkle değil (.claude/rules/erisilebilirlik.md).
// - Çıkarılan ürünün bildiriminde "Geri al" vardır: ürün eski yerine döner. Odak bir sonraki satırın çıkar düğmesine,
//   sepet boşalınca boş hâlin bağlantısına geçer.
// - Özet: ara toplam, kargo, toplam ve vergi dökümü (vergi dahil gösterimde "toplama dahil"). Ödeme adımı kart 0213
//   ile gelir: o güne kadar "Ödemeye geç" yoktur.
// - Telefonda sepet sayfasının toplamı altta sabit durur.
import { useEffect, useRef } from "react";
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import { AdetSecici } from "../../../bilesenler/parcalar/adet-secici";
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { bildirimGoster } from "../../../bilesenler/parcalar/bildirim";
import { BosHal } from "../../../bilesenler/parcalar/bos-hal";
import { IkonDugmesi } from "../../../bilesenler/parcalar/dugme";
import { IskeletGorunum } from "../../../bilesenler/parcalar/iskelet";
import { sinif } from "../../../bilesenler/parcalar/sinif";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import { useMetin } from "../../metinler/istemci-metni";
import type { MetinAnahtari } from "../../metinler/metin";
import { doldur } from "../../moduller/eposta/sablon";
import { vitrinAdresleri } from "../adresler";
import { adetDegistir, geriKoy, sepettenCikar, useSepet, useSepetGorunumu } from "./durum";
import { SepetFiyati } from "./fiyat";
import type { SepetGorunumu, SepetGorunumuSatiri } from "./veri";

type Metin = ReturnType<typeof useMetin>;

const uyariMetinleri = {
  "fiyat-degisti": "vitrin.sepet.uyari.fiyatDegisti",
  "stok-azaldi": "vitrin.sepet.uyari.stokAzaldi",
  "en-cok": "vitrin.sepet.uyari.enCok",
  "en-az": "vitrin.sepet.uyari.enAz",
  tukendi: "vitrin.sepet.uyari.tukendi",
  kaldirildi: "vitrin.sepet.uyari.kaldirildi",
} as const satisfies Record<SepetGorunumuSatiri["uyarilar"][number]["kod"], MetinAnahtari>;

// Satırı durduran uyarı tehlike renginde, öteki uyarılar uyarı renginde.
const durdurur = (kod: SepetGorunumuSatiri["uyarilar"][number]["kod"]) =>
  kod === "tukendi" || kod === "kaldirildi" || kod === "en-az";

const uyariYazisi = (
  metin: Metin,
  satir: SepetGorunumuSatiri,
  uyari: SepetGorunumuSatiri["uyarilar"][number],
) =>
  doldur(metin(uyariMetinleri[uyari.kod]), {
    ...("sayi" in uyari ? { sayi: String(uyari.sayi) } : {}),
    ...("eskiYazili" in uyari && uyari.eskiYazili !== undefined ? { eski: uyari.eskiYazili } : {}),
    ...(satir.fiyat === undefined ? {} : { yeni: satir.fiyat.enDusuk.yazili.tutar }),
  });

export const satirAdi = (metin: Metin, satir: SepetGorunumuSatiri) =>
  satir.urun?.ad ?? metin("vitrin.sepet.kaldirilanUrun");

function SepetSatiri({
  satir,
  kucuk,
  sonraki,
}: {
  satir: SepetGorunumuSatiri;
  kucuk: boolean;
  // Çıkarınca odağın gideceği yer.
  sonraki: () => void;
}) {
  const metin = useMetin();
  const ad = satirAdi(metin, satir);
  // Gösterilen adet: müşterinin değiştirdiği adedin cevabı henüz gelmediyse tarayıcıdaki adet, gelince sunucunun
  // (sınıra indirilmiş) adedi. Sunucunun adedi gösterilse, cevap gelmeden ikinci basış eski adetten sayardı.
  const yerel = useSepet().kalemler.find((kalem) => kalem.birim === satir.birim);
  const gosterilenAdet =
    yerel !== undefined && yerel.adet !== satir.istenenAdet ? yerel.adet : satir.adet;
  const cikar = () => {
    const cikan = sepettenCikar(satir.birim);
    sonraki();
    if (cikan === undefined) return;
    bildirimGoster("bilgi", doldur(metin("vitrin.sepet.cikarildi"), { urun: ad }), {
      etiket: metin("vitrin.sepet.geriAl"),
      tikla: () => geriKoy(cikan.kalem, cikan.sira),
    });
  };
  return (
    <li
      data-slot="sepet-satiri"
      data-birim={satir.birim}
      className="flex items-start gap-3 border-b border-kenar py-4 tablet:gap-4"
    >
      <span
        className={sinif(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-orta bg-yuzey",
          kucuk ? "size-16" : "size-20 tablet:size-24",
          !satir.satilabilir && "opacity-50",
        )}
      >
        {satir.gorsel === undefined ? (
          <Ikon ad="gorsel" className="text-soluk-yazi" />
        ) : (
          // biome-ignore lint/performance/noImgElement: boyutlar çekirdekte üretilir (karar 0073), srcset ile seçilir.
          <img
            src={satir.gorsel.kaynaklar[0]?.adres}
            srcSet={satir.gorsel.kaynaklar.map((k) => `${k.adres} ${k.genislik}w`).join(", ")}
            sizes="6rem"
            alt=""
            width={satir.gorsel.genislik}
            height={satir.gorsel.yukseklik}
            loading="lazy"
            className="size-7/8 object-contain"
          />
        )}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {satir.urun === undefined ? (
          <span className="font-kalin">{ad}</span>
        ) : (
          <Baglanti
            href={satir.urun.adres}
            gorunum="baglanti"
            className="min-h-0 no-underline hover:underline"
          >
            {ad}
          </Baglanti>
        )}
        {satir.secim.length === 0 ? null : (
          <span className="text-kucuk text-soluk-yazi">
            {satir.secim.map((secim) => doldur(metin("vitrin.sepet.secim"), secim)).join(" · ")}
          </span>
        )}
        {satir.fiyat === undefined ? null : <SepetFiyati fiyat={satir.fiyat} />}
        {satir.uyarilar.map((uyari) => (
          <span
            key={uyari.kod}
            className={sinif(
              "flex items-start gap-1.5 text-kucuk font-kalin",
              durdurur(uyari.kod) ? "text-tehlike-yazi" : "text-uyari-yazi",
            )}
          >
            <Ikon ad={durdurur(uyari.kod) ? "uyari" : "bilgi"} className="mt-0.5 size-4 shrink-0" />
            {uyariYazisi(metin, satir, uyari)}
          </span>
        ))}
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          {satir.satilabilir ? (
            <AdetSecici
              deger={gosterilenAdet}
              enAz={1}
              enCok={Math.max(satir.enCok, gosterilenAdet)}
              onDegerDegisti={(adet) => adetDegistir(satir.birim, adet)}
              etiketler={{
                grup: doldur(metin("vitrin.sepet.adetUrun"), { urun: ad }),
                azalt: doldur(metin("vitrin.sepet.azalt"), { urun: ad }),
                artir: doldur(metin("vitrin.sepet.artir"), { urun: ad }),
              }}
            />
          ) : null}
          {satir.yaziliTutar === undefined ? null : (
            <span className="ml-auto whitespace-nowrap font-en-kalin">{satir.yaziliTutar}</span>
          )}
        </div>
      </div>
      <IkonDugmesi
        ikon="sil"
        etiket={doldur(metin("vitrin.sepet.cikar"), { urun: ad })}
        onClick={cikar}
        data-sepet-cikar=""
        className="-mt-2 -mr-2"
      />
    </li>
  );
}

function SepetSatirlari({ gorunum, kucuk }: { gorunum: SepetGorunumu; kucuk: boolean }) {
  const metin = useMetin();
  const liste = useRef<HTMLUListElement>(null);
  // Çıkarılan satırdan sonra odak bir sonraki satırın çıkar düğmesine, son satırsa bir öncekine geçer.
  const odakla = (birim: string) => () => {
    const dugmeler = [
      ...(liste.current?.querySelectorAll<HTMLElement>("[data-sepet-cikar]") ?? []),
    ];
    const sira = gorunum.satirlar.findIndex((satir) => satir.birim === birim);
    requestAnimationFrame(() => {
      const kalan = [...(liste.current?.querySelectorAll<HTMLElement>("[data-sepet-cikar]") ?? [])];
      (kalan[sira] ?? kalan[sira - 1] ?? dugmeler[0])?.focus();
    });
  };
  return (
    <ul ref={liste} aria-label={metin("vitrin.sepet.satirlar")} className="border-t border-kenar">
      {gorunum.satirlar.map((satir) => (
        <SepetSatiri key={satir.birim} satir={satir} kucuk={kucuk} sonraki={odakla(satir.birim)} />
      ))}
    </ul>
  );
}

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

export function SepetOzeti({ gorunum }: { gorunum: SepetGorunumu }) {
  const metin = useMetin();
  const vergiAdi = (ad?: string) => ad ?? metin("vitrin.sepet.vergiAdsiz");
  return (
    <dl className="flex flex-col gap-3">
      <OzetSatiri
        ad={doldur(metin("vitrin.sepet.araToplam"), { sayi: String(gorunum.adet) })}
        deger={gorunum.yazili.araToplam}
      />
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

function Yukleniyor() {
  const metin = useMetin();
  return (
    <div role="status" className="flex flex-col gap-3">
      <span className="sr-only">{metin("vitrin.sepet.yukleniyor")}</span>
      <IskeletGorunum className="h-24 w-full" />
      <IskeletGorunum className="h-24 w-full" />
    </div>
  );
}

// Sepet sayfasının içi. ornek: katalogun örnek kipinde gösterilen veri.
export function SepetSayfasiIcerigi({ ornek }: { ornek?: SepetGorunumu }) {
  const metin = useMetin();
  const durum = useSepetGorunumu(true, ornek);
  const bosBaglanti = useRef<HTMLAnchorElement>(null);
  const bos = durum.tur === "hazir" && durum.gorunum.satirlar.length === 0;
  useEffect(() => {
    if (bos && document.activeElement === document.body) bosBaglanti.current?.focus();
  }, [bos]);
  if (durum.tur === "yukleniyor") return <Yukleniyor />;
  if (durum.tur === "hata") return <Uyari tur="tehlike">{metin("vitrin.sepet.hata")}</Uyari>;
  const { gorunum } = durum;
  if (gorunum.satirlar.length === 0) {
    return (
      <BosHal
        ikon="sepet"
        baslik={metin("vitrin.sepet.bosBaslik")}
        aciklama={metin("vitrin.sepet.bosAciklama")}
      >
        <Baglanti ref={bosBaglanti} href={vitrinAdresleri.anasayfa} gorunum="birincil">
          {metin("vitrin.sepet.alisveriseBasla")}
        </Baglanti>
      </BosHal>
    );
  }
  const degisiklik = gorunum.satirlar.some((satir) => satir.uyarilar.length > 0);
  return (
    <div className="flex flex-col gap-4">
      {degisiklik ? <Uyari tur="uyari">{metin("vitrin.sepet.degisiklikVar")}</Uyari> : null}
      <div className="flex flex-col gap-6 masaustu:flex-row masaustu:items-start masaustu:gap-8">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <SepetSatirlari gorunum={gorunum} kucuk={false} />
          <Baglanti href={vitrinAdresleri.anasayfa} gorunum="sade" className="self-start">
            <Ikon ad="onceki" />
            {metin("vitrin.sepet.alisveriseDevam")}
          </Baglanti>
        </div>
        <section
          aria-labelledby="sepet-ozet-basligi"
          className="flex flex-col gap-4 rounded-orta border border-kenar bg-zemin p-5 masaustu:sticky masaustu:top-4 masaustu:w-form masaustu:shrink-0"
        >
          <h2 id="sepet-ozet-basligi" className="font-baslik text-baslik-4 font-baslik-kalinligi">
            {metin("vitrin.sepet.ozet")}
          </h2>
          <SepetOzeti gorunum={gorunum} />
        </section>
      </div>
      <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t border-kenar bg-zemin px-4 py-3 shadow-kart tablet:hidden">
        <span className="text-kucuk text-soluk-yazi">{metin("vitrin.sepet.toplam")}</span>
        <strong className="text-buyuk font-en-kalin">{gorunum.yazili.toplam}</strong>
      </div>
    </div>
  );
}

// Sepet penceresindeki içerik (sepet-penceresi.tsx).
export function SepetPenceresiIcerigi({ acik }: { acik: boolean }) {
  const metin = useMetin();
  const durum = useSepetGorunumu(acik);
  if (durum.tur === "yukleniyor") return <Yukleniyor />;
  if (durum.tur === "hata") return <Uyari tur="tehlike">{metin("vitrin.sepet.hata")}</Uyari>;
  const { gorunum } = durum;
  if (gorunum.satirlar.length === 0) {
    return <BosHal ikon="sepet" baslik={metin("vitrin.sepet.bosBaslik")} duzey={3} />;
  }
  return (
    <div className="flex flex-col gap-4">
      <SepetSatirlari gorunum={gorunum} kucuk />
      <dl className="flex flex-col gap-1">
        <OzetSatiri
          ad={doldur(metin("vitrin.sepet.araToplam"), { sayi: String(gorunum.adet) })}
          deger={gorunum.yazili.araToplam}
          vurgu
        />
      </dl>
      <p className="text-kucuk text-soluk-yazi">{metin("vitrin.sepet.pencereNotu")}</p>
    </div>
  );
}
