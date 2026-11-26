"use client";
// Sepet penceresinin içeriği (kart 0212'den ayrıldı, kart 0329): eklenen ürünün bildirimi, sade satırlar (adet ve
// tutar; değişiklik sepet sayfasında) ve ara toplam. Pencere bütün vitrin sayfalarında yüklenir: bu dosya sepet
// sayfasının kodunu (sepet-gorunumu.tsx: kupon alanı, adet seçici, özet) içe aktarmaz (kart 0329, kod sınırı).
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import { BosHal } from "../../../bilesenler/parcalar/bos-hal";
import { sinif } from "../../../bilesenler/parcalar/sinif";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import { doldur } from "../../metinler/doldur";
import { useMetin } from "../../metinler/istemci-metni";
import { useSepet, useSepetGorunumu } from "./durum";
import {
  durdurur,
  SatirGorseli,
  SecimYazisi,
  SepetYukleniyor,
  satirAdi,
  uyariYazisi,
} from "./satir-parcalari";
import type { SepetGorunumuSatiri } from "./veri";

// Sepet penceresinin satırı (taslak): küçük görsel ve üstünde adet, ad, seçim, "n adet" ve tutar. Pencerede adet
// değişmez, ürün çıkarılmaz: bunlar sepet sayfasındadır.
function PencereSatiri({ satir }: { satir: SepetGorunumuSatiri }) {
  const metin = useMetin();
  const ad = satirAdi(metin, satir);
  return (
    <li data-slot="sepet-satiri" data-birim={satir.birim} className="flex items-start gap-3 py-2">
      <span className="relative shrink-0">
        <SatirGorseli satir={satir} buyukluk="size-12" />
        <span
          aria-hidden="true"
          className="absolute -top-1.5 -left-1.5 flex size-5 items-center justify-center rounded-dugme bg-yazi text-kucuk font-en-kalin text-zemin"
        >
          {satir.adet}
        </span>
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-govde font-kalin">{ad}</span>
        <SecimYazisi satir={satir} />
        <span className="text-kucuk text-soluk-yazi">
          {doldur(metin("vitrin.sepet.adetSayisi"), { sayi: String(satir.adet) })}
        </span>
        {satir.uyarilar.map((uyari) => (
          <span
            key={uyari.kod}
            className={sinif(
              "text-kucuk font-kalin",
              durdurur(uyari.kod) ? "text-tehlike-yazi" : "text-uyari-yazi",
            )}
          >
            {uyariYazisi(metin, satir, uyari)}
          </span>
        ))}
      </div>
      {satir.yaziliTutar === undefined ? null : (
        <span className="whitespace-nowrap text-govde">{satir.yaziliTutar}</span>
      )}
    </li>
  );
}

// Sepet penceresindeki içerik (sepet-penceresi.tsx).
export function SepetPenceresiIcerigi({ acik }: { acik: boolean }) {
  const metin = useMetin();
  const durum = useSepetGorunumu(acik);
  const { eklenen } = useSepet();
  if (durum.tur === "yukleniyor") return <SepetYukleniyor />;
  if (durum.tur === "hata") return <Uyari tur="tehlike">{metin("vitrin.sepet.hata")}</Uyari>;
  const { gorunum } = durum;
  if (gorunum.satirlar.length === 0) {
    return <BosHal ikon="sepet" baslik={metin("vitrin.sepet.bosBaslik")} duzey={3} />;
  }
  return (
    <div className="flex flex-col gap-4">
      {eklenen === undefined ? null : (
        <p className="flex items-center gap-2 rounded-orta bg-basari-zemin px-4 py-3 text-basari-yazi">
          <Ikon ad="basari" className="shrink-0" />
          <span>{doldur(metin("vitrin.sepet.eklendi"), { urun: eklenen })}</span>
        </p>
      )}
      <ul aria-label={metin("vitrin.sepet.satirlar")} className="flex flex-col gap-1">
        {gorunum.satirlar.map((satir) => (
          <PencereSatiri key={satir.birim} satir={satir} />
        ))}
      </ul>
      <dl className="flex flex-col gap-1 border-t border-kenar pt-4">
        <div className="flex justify-between gap-3 font-kalin">
          <dt>{doldur(metin("vitrin.sepet.araToplam"), { sayi: String(gorunum.adet) })}</dt>
          <dd className="whitespace-nowrap font-en-kalin">{gorunum.yazili.araToplam}</dd>
        </div>
      </dl>
      <p className="text-kucuk text-soluk-yazi">{metin("vitrin.sepet.pencereNotu")}</p>
    </div>
  );
}
