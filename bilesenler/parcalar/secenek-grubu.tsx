"use client";
// Seçenek grubu (kart 0138, Canlı Çarşı taslağı): ürün sayfasında beden ve renk gibi bir seçeneğin değerleri
// arasında tek seçim. Radix'in radyo grubudur: Tab gruba bir kez girer, ok tuşları değerler arasında gezer,
// boşluk seçer.
//
// - Seçilemeyen değer (tükenmiş) görünür, üstü çizilidir ve seçilemez; odak alır, ekran okuyucu adının sonunda
//   "tükendi" ekini duyar (aria-disabled). Ok tuşuyla üstüne gelinince seçim değişmez.
// - Tükenmiş ama seçilebilen değer (kart 0144: stoğa gelince haber ver açıkken) aynı biçimde üstü çizili görünür ve
//   eki duyulur, seçilebilir.
// - Başlık (legend) ve ekler kullanan sayfadan gelir: parça metin yazmaz.
// - Kart görünümü (kart 0214, ödeme yöntemi): her değer tam genişlikte bir satırdır; seçim noktası, kalın ad, altında
//   soluk açıklama ve sağda ikon. Seçili satırın kenarı kalınlaşır. Değerin ekran okuyucudaki adı yalnız
//   adıdır (ve ekidir); açıklama ayrı, açıklama olarak okunur.
// - Örnekli görünüm (kart 0260, tema ayarları): değerler yan yana kartlardır; kartın üstünde değerin küçük örneği
//   (yazı tipiyle "Ağ", köşe, düğme), altında adı. Örnek yalnız gösterimdir, ekran okuyucudan gizlidir; adı adıdır.
import { RadioGroup } from "radix-ui";
import { type ReactNode, useId } from "react";
import { Ikon } from "../ikonlar/ikon.tsx";
import type { IkonAdi } from "../ikonlar/sozluk.ts";
import { sinif } from "./sinif.ts";

export type SecenekGrubuOgesi = {
  deger: string;
  ad: string;
  secilemez?: boolean;
  // Seçilebilir ama tükenmiş: üstü çizili görünür, eki duyulur (secilemez ile birlikte verilmez).
  tukenmis?: boolean;
  // Yalnız kart görünümünde: adın altındaki açıklama ve sağdaki ikon.
  aciklama?: string;
  ikon?: IkonAdi;
  // Yalnız örnekli görünümde: adın üstündeki örnek.
  ornek?: ReactNode;
};

export function SecenekGrubu({
  baslik,
  etiket,
  ogeler,
  deger,
  onDegerDegisti,
  secilemezEki,
  aciklama,
  hata,
  gorunum = "dugme",
  className,
}: {
  // Grubun görünen başlığı, örneğin "Beden: M".
  baslik: ReactNode;
  // Grubun ekran okuyucudaki adı, örneğin "Beden".
  etiket: string;
  ogeler: readonly SecenekGrubuOgesi[];
  // Seçili değer; seçim yoksa undefined.
  deger: string | undefined;
  onDegerDegisti: (deger: string) => void;
  // Seçilemeyen ya da tükenmiş değerin adına eklenen, yalnız ekran okuyucuda duyulan yazı: ", tükendi".
  secilemezEki: string;
  // Grubun altındaki açıklama, örneğin "Üstü çizili bedenler bu renkte tükendi."
  aciklama?: string;
  // Grubun hatası (kart 0139: seçim yapılmadan gönderilen form). Grup geçersiz işaretlenir, yazı ona bağlanır.
  hata?: string;
  // dugme: yan yana küçük düğmeler (beden, renk); kart: alt alta tam genişlikte satırlar (ödeme yöntemi);
  // ornekli: yan yana, üstünde örneği olan kartlar (tema ayarları).
  gorunum?: "dugme" | "kart" | "ornekli";
  className?: string;
}) {
  const id = useId();
  const aciklamaKimligi = `${id}-aciklama`;
  const hataKimligi = `${id}-hata`;
  const bagli = [
    ...(aciklama === undefined ? [] : [aciklamaKimligi]),
    ...(hata === undefined ? [] : [hataKimligi]),
  ].join(" ");
  return (
    <fieldset
      data-slot="secenek-grubu"
      className={sinif("m-0 flex min-w-0 flex-col gap-2 border-0 p-0", className)}
    >
      <legend className="mb-2 p-0 text-govde">{baslik}</legend>
      <RadioGroup.Root
        aria-label={etiket}
        {...(bagli === "" ? {} : { "aria-describedby": bagli })}
        {...(hata === undefined ? {} : { "aria-invalid": true })}
        value={deger ?? ""}
        onValueChange={(yeni) => {
          if (ogeler.find((oge) => oge.deger === yeni)?.secilemez !== true) onDegerDegisti(yeni);
        }}
        className={gorunum === "kart" ? "flex flex-col gap-2" : "flex flex-wrap gap-2"}
      >
        {ogeler.map((oge) =>
          gorunum === "ornekli" ? (
            <RadioGroup.Item
              key={oge.deger}
              value={oge.deger}
              {...(oge.secilemez === true ? { "aria-disabled": true } : {})}
              className="flex min-h-11 min-w-20 cursor-pointer flex-col items-center gap-2 rounded-orta border border-alan-kenari bg-zemin px-4 py-3 text-govde text-yazi transition-colors duration-kisa hover:bg-yuzey isaretli:border-2 isaretli:border-yazi isaretli:font-kalin aria-disabled:cursor-not-allowed aria-disabled:border-dashed aria-disabled:text-soluk-yazi"
            >
              {oge.ornek === undefined ? null : (
                <span aria-hidden="true" className="flex h-10 items-center justify-center">
                  {oge.ornek}
                </span>
              )}
              <span>{oge.ad}</span>
              {oge.secilemez === true || oge.tukenmis === true ? (
                <span className="sr-only">{secilemezEki}</span>
              ) : null}
            </RadioGroup.Item>
          ) : gorunum === "kart" ? (
            <RadioGroup.Item
              key={oge.deger}
              value={oge.deger}
              {...(oge.secilemez === true ? { "aria-disabled": true } : {})}
              // Adı yalnız değerin adı (ve ekidir); açıklama ayrı okunur, adın içinde tekrar etmez.
              aria-labelledby={`${id}-${oge.deger}-ad${oge.secilemez === true || oge.tukenmis === true ? ` ${id}-${oge.deger}-ek` : ""}`}
              {...(oge.aciklama === undefined ? {} : { "aria-describedby": `${id}-${oge.deger}` })}
              className="group flex min-h-11 w-full cursor-pointer items-start gap-3 rounded-orta border border-alan-kenari bg-zemin px-4 py-3 text-left text-govde text-yazi transition-colors duration-kisa hover:bg-yuzey isaretli:border-2 isaretli:border-yazi aria-disabled:cursor-not-allowed aria-disabled:border-dashed aria-disabled:text-soluk-yazi"
            >
              <span
                aria-hidden="true"
                className="mt-1 flex size-4 shrink-0 items-center justify-center rounded-dugme border-2 border-alan-kenari group-isaretli:border-yazi"
              >
                <RadioGroup.Indicator className="size-2 rounded-dugme bg-yazi" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span id={`${id}-${oge.deger}-ad`} className="font-kalin">
                  {oge.ad}
                </span>
                {oge.aciklama === undefined ? null : (
                  <span id={`${id}-${oge.deger}`} className="text-kucuk text-soluk-yazi">
                    {oge.aciklama}
                  </span>
                )}
              </span>
              {oge.ikon === undefined ? null : (
                <Ikon ad={oge.ikon} className="mt-1 size-5 shrink-0 text-soluk-yazi" />
              )}
              {oge.secilemez === true || oge.tukenmis === true ? (
                <span id={`${id}-${oge.deger}-ek`} className="sr-only">
                  {secilemezEki}
                </span>
              ) : null}
            </RadioGroup.Item>
          ) : (
            <RadioGroup.Item
              key={oge.deger}
              value={oge.deger}
              {...(oge.secilemez === true ? { "aria-disabled": true } : {})}
              className={sinif(
                "inline-flex h-11 min-w-12 cursor-pointer items-center justify-center rounded-kucuk border border-alan-kenari bg-zemin px-4 text-govde font-orta text-yazi transition-colors duration-kisa hover:bg-yuzey isaretli:border-2 isaretli:border-yazi isaretli:font-en-kalin aria-disabled:cursor-not-allowed aria-disabled:border-dashed aria-disabled:bg-zemin aria-disabled:text-soluk-yazi aria-disabled:line-through",
                oge.tukenmis === true ? "border-dashed text-soluk-yazi line-through" : undefined,
              )}
            >
              {oge.ad}
              {oge.secilemez === true || oge.tukenmis === true ? (
                <span className="sr-only">{secilemezEki}</span>
              ) : null}
            </RadioGroup.Item>
          ),
        )}
      </RadioGroup.Root>
      {aciklama === undefined ? null : (
        <span id={aciklamaKimligi} className="text-kucuk text-soluk-yazi">
          {aciklama}
        </span>
      )}
      {hata === undefined ? null : (
        <span id={hataKimligi} className="font-kalin text-tehlike-yazi">
          {hata}
        </span>
      )}
    </fieldset>
  );
}
