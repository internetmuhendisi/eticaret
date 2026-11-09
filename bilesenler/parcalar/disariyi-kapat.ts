// Açılan pencere ve seçim listesi sayfanın geri kalanını etkisiz kılar (kart 0103). Radix dışarıyı
// ekran okuyucudan gizler (aria-hidden) ama odaklanabilir bırakır; erişilebilirlik taraması bunu hata
// sayar (aria-hidden-focus, ölçüldü). inert dışarıdaki öğeleri gerçekten etkisiz kılar: ne odak alır ne
// ekran okuyucuda görünür. Parça açıldığında body'nin, parçayı taşımayan çocuklarına konur, kapanınca
// yalnız buranın koyduğu işaret kaldırılır. Parça açıkken sonradan eklenen öğe (ipucu) etkilenmez.
// data-disarida-kalir işaretli öğe hiç etkisiz kılınmaz: bildirim alanı pencere açıkken de okunur ve
// kapatılabilir.
import type { Ref, RefCallback } from "react";

export const disaridaKalirIsareti = "data-disarida-kalir";

export function disariyiKapat(dugum: HTMLElement | null): (() => void) | undefined {
  if (dugum === null) return undefined;
  const kapatilanlar = [...document.body.children].filter(
    (oge): oge is HTMLElement =>
      oge instanceof HTMLElement &&
      !oge.contains(dugum) &&
      !oge.inert &&
      !oge.hasAttribute(disaridaKalirIsareti),
  );
  for (const oge of kapatilanlar) oge.inert = true;
  return () => {
    for (const oge of kapatilanlar) oge.inert = false;
  };
}

// Dışarıda kalan öğeye (bildirim) yapılan tıklama pencereyi kapatmaz: Radix onu "dışarı" sayardı.
export function disaridaKalanaTiklama(olay: {
  target: EventTarget | null;
  preventDefault(): void;
}) {
  if (olay.target instanceof Element && olay.target.closest(`[${disaridaKalirIsareti}]`) !== null) {
    olay.preventDefault();
  }
}

// Kullanan sayfanın verdiği ref ile disariyiKapat'ı birlikte bağlar: sayfa ref verince inert kalkmaz.
export function disariyiKapatanRef<T extends HTMLElement>(
  kullananinRefi: Ref<T> | undefined,
): RefCallback<T> {
  return (dugum) => {
    const temizle = disariyiKapat(dugum);
    let kullananinTemizligi: (() => void) | undefined;
    if (typeof kullananinRefi === "function") {
      const sonuc = kullananinRefi(dugum);
      if (typeof sonuc === "function") kullananinTemizligi = sonuc;
    } else if (kullananinRefi != null) {
      kullananinRefi.current = dugum;
    }
    return () => {
      temizle?.();
      if (kullananinTemizligi !== undefined) kullananinTemizligi();
      else if (typeof kullananinRefi === "function") kullananinRefi(null);
      else if (kullananinRefi != null) kullananinRefi.current = null;
    };
  };
}
