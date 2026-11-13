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
import { RadioGroup } from "radix-ui";
import { type ReactNode, useId } from "react";
import { sinif } from "./sinif.ts";

export type SecenekGrubuOgesi = {
  deger: string;
  ad: string;
  secilemez?: boolean;
  // Seçilebilir ama tükenmiş: üstü çizili görünür, eki duyulur (secilemez ile birlikte verilmez).
  tukenmis?: boolean;
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
        className="flex flex-wrap gap-2"
      >
        {ogeler.map((oge) => (
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
        ))}
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
