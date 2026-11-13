"use client";
// Bölüm formunun görsel alanı (kart 0142, kullanıcı kararı): sitede kayıtlı görsellerden biri seçilir; panelden
// görsel yükleme ayrı bir iştir. Seçili görsel küçük önizlemesi ve ölçüsüyle görünür; "Görsel seç" ya da
// "Değiştir" görselleri pencerede ızgara olarak açar, birine basınca seçilir ve pencere kapanır, odak açan
// düğmeye döner. Önizleme panelin görsel ucundan gelir (GET /kapi/yonetici/panel-gorseli): vitrin görseli ucu
// henüz seçilmemiş görseli vermez. Görsellerin adı yoktur: ekran okuyucu sırasını ve ölçüsünü duyar ("Görsel 3,
// 1200 × 500 piksel"); aynı ölçüdeki görseller sırayla ayrılır. Kaldırınca odak "Görsel seç" düğmesine geçer.
import { useState } from "react";
import { FormAlani } from "../../bilesenler/form/form-alani";
import { Dugme } from "../../bilesenler/parcalar/dugme";
import {
  Pencere,
  PencereAciklamasi,
  PencereBasligi,
  PencereIcerigi,
  PencereTetikleyici,
  PencereUstu,
} from "../../bilesenler/parcalar/pencere";
import { useMetin } from "../metinler/istemci-metni";
import type { GorselSecenegi } from "../moduller/duzen/secenekler";
import { doldur } from "../moduller/eposta/sablon";
import { yoneticiUcu } from "./panel-istegi";

export const panelGorseliAdresi = (kimlik: string): string =>
  `${yoneticiUcu("panel-gorseli")}?${new URLSearchParams({ d: kimlik, b: "kucuk" })}`;

export function GorselSecimi({
  etiket,
  aciklama,
  hata,
  gorseller,
  deger,
  degistir,
  zorunlu,
}: {
  etiket: string;
  aciklama: string | undefined;
  hata: string | undefined;
  gorseller: readonly GorselSecenegi[];
  deger: unknown;
  degistir: (deger: unknown) => void;
  zorunlu: boolean;
}) {
  const metin = useMetin();
  const [acik, setAcik] = useState(false);
  const secili = typeof deger === "string" ? deger : undefined;
  const seciliGorsel = gorseller.find((gorsel) => gorsel.kimlik === secili);
  const olcu = (gorsel: GorselSecenegi) => ({
    genislik: String(gorsel.genislik),
    yukseklik: String(gorsel.yukseklik),
  });
  return (
    <FormAlani
      etiket={etiket}
      {...(aciklama === undefined ? {} : { aciklama })}
      {...(hata === undefined ? {} : { hata })}
    >
      {(alan) => (
        <div className="flex flex-wrap items-center gap-3">
          {secili === undefined ? (
            <span className="text-kucuk text-soluk-yazi">
              {metin("yonetim.gorselSecimi.secilmedi")}
            </span>
          ) : (
            <span className="flex items-center gap-3">
              {/* biome-ignore lint/performance/noImgElement: panelin küçük önizlemesi, boyutu uçtan gelir. */}
              <img
                src={panelGorseliAdresi(secili)}
                alt=""
                className="size-16 rounded-kucuk border border-kenar bg-yuzey object-cover"
              />
              {seciliGorsel === undefined ? null : (
                <span className="text-kucuk text-soluk-yazi">
                  {doldur(metin("yonetim.gorselSecimi.olcu"), olcu(seciliGorsel))}
                </span>
              )}
            </span>
          )}
          <Pencere open={acik} onOpenChange={setAcik}>
            <PencereTetikleyici asChild>
              <Dugme tur="cerceveli" {...alan}>
                {metin(
                  secili === undefined
                    ? "yonetim.gorselSecimi.sec"
                    : "yonetim.gorselSecimi.degistir",
                )}
              </Dugme>
            </PencereTetikleyici>
            <PencereIcerigi kapatEtiketi={metin("ortak.parca.kapat")} genislik="orta">
              <PencereUstu>
                <PencereBasligi>{metin("yonetim.gorselSecimi.baslik")}</PencereBasligi>
                <PencereAciklamasi>{metin("yonetim.gorselSecimi.aciklama")}</PencereAciklamasi>
              </PencereUstu>
              {gorseller.length === 0 ? (
                <p>{metin("yonetim.gorselSecimi.bos")}</p>
              ) : (
                <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0 tablet:grid-cols-5">
                  {gorseller.map((gorsel, sira) => (
                    <li key={gorsel.kimlik}>
                      <Dugme
                        tur="sade"
                        aria-label={doldur(metin("yonetim.gorselSecimi.gorselAdi"), {
                          ...olcu(gorsel),
                          sira: String(sira + 1),
                        })}
                        aria-pressed={gorsel.kimlik === secili}
                        className="h-auto w-full p-1 aria-pressed:ring-2 aria-pressed:ring-yazi"
                        onClick={() => {
                          degistir(gorsel.kimlik);
                          setAcik(false);
                        }}
                      >
                        {/* biome-ignore lint/performance/noImgElement: panelin küçük önizlemesi. */}
                        <img
                          src={panelGorseliAdresi(gorsel.kimlik)}
                          alt=""
                          loading="lazy"
                          className="aspect-square w-full rounded-kucuk bg-yuzey object-cover"
                        />
                      </Dugme>
                    </li>
                  ))}
                </ul>
              )}
            </PencereIcerigi>
          </Pencere>
          {zorunlu || secili === undefined ? null : (
            <Dugme
              tur="sade"
              onClick={() => {
                // Bu düğme kalkar: odak alanın kendi düğmesine geçer.
                document.getElementById(alan.id)?.focus();
                degistir(undefined);
              }}
            >
              {metin("yonetim.gorselSecimi.kaldir")}
            </Dugme>
          )}
        </div>
      )}
    </FormAlani>
  );
}
