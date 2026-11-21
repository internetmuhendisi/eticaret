"use client";
// Formun hata özeti (kart 0259, .claude/rules/formlar.md; taslak: "Ortak form", hata özeti). Formun başında durur:
// başlık kaç alanın düzeltileceğini söyler, her hata bir satırdır. Alanı formda olan hata alana götüren bağlantıdır
// (basınca odak alana gider), alanı olmayan hata (yetki, bağlantı koptu) düz yazıdır. Kutu odak alabilir: birden çok
// hatada odak buraya gelir. Metinleri kullanan verir.
import type { Ref } from "react";
import { Dugme } from "../parcalar/dugme.tsx";
import { sinif } from "../parcalar/sinif.ts";
import { Uyari } from "../parcalar/uyari.tsx";

export type OzetHatasi = {
  // Satırın yazısı: "Telefon: numara 10 haneli olmalı" ya da alanı olmayan hatanın metni.
  metin: string;
  // Alana götürür; yoksa satır düz yazıdır.
  git?: () => void;
};

export function HataOzeti({
  baslik,
  hatalar,
  ref,
  className,
}: {
  baslik: string;
  hatalar: readonly OzetHatasi[];
  ref?: Ref<HTMLDivElement>;
  className?: string;
}) {
  return (
    <div
      ref={ref}
      tabIndex={-1}
      data-slot="hata-ozeti"
      className={sinif("rounded-orta", className)}
    >
      <Uyari tur="tehlike" baslik={baslik}>
        <ul className="flex flex-col">
          {hatalar.map((hata, sira) => (
            // Aynı metin iki kez gelebilir (iki alanın aynı hatası); sıra anahtardır.
            <li key={`${sira}-${hata.metin}`}>
              {hata.git === undefined ? (
                hata.metin
              ) : (
                <Dugme tur="baglanti" className="min-h-11 text-left" onClick={hata.git}>
                  {hata.metin}
                </Dugme>
              )}
            </li>
          ))}
        </ul>
      </Uyari>
    </div>
  );
}
