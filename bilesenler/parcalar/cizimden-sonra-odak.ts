"use client";
// Durum değişikliğiyle çizilecek, kalkacak ya da yeri değişecek öğeye odak (kart 0307). Odak isteği, onu doğuran
// durum güncellemesiyle aynı çizime girer ve çizim bittikten sonra (React efektinde) verilir: öğe o anda vardır ve
// son yerindedir. Ekran sunucunun cevabıyla değişiyorsa (sepetten çıkan satır) `hazir` verilir: istek, koşul
// sağlanana kadar her çizimden sonra bekler; yeni istek eskisinin yerini alır. Beklerken kullanıcı odağı başka bir
// öğeye taşıdıysa istek bırakılır: odak yalnız istek anındaki öğede ya da boşta (gövdede) duruyorsa verilir.
//
// Durum geçişle (`startTransition`, `useDeferredValue`) yazılıyorsa odak isteği geçişten önce çizilir; hedef o anda
// eski DOM'da aranır. Bugün böyle bir kullanım yok (karar 0182).
//
// Eskiden odak `requestAnimationFrame` ile bir sonraki karede veriliyordu. Kare çizimden önce gelirse (yüklü
// makinede, sayfa yenilenirken) öğe henüz yoktu, gizliydi ya da kalkmak üzereydi; odak hiç verilmiyor ya da
// kaybolan öğede kalıyordu (hat 45567962785, Hesabım'ın yeni yedek kodları).
//
// Kullanım: durumu yazan işlevin içinde, durumu yazdıktan hemen sonra `odakla(() => ref.current)`.
import { useCallback, useEffect, useRef, useState } from "react";

type Hedef = () => HTMLElement | null | undefined;
type Istek = { hedef: Hedef; hazir: (() => boolean) | undefined; onceki: Element | null };

export const useCizimdenSonraOdak = (): ((hedef: Hedef, hazir?: () => boolean) => void) => {
  const bekleyen = useRef<Istek | null>(null);
  const [, setIstek] = useState(0);
  // Bağımlılıksız: her çizimden sonra bekleyen istek denenir.
  useEffect(() => {
    const istek = bekleyen.current;
    if (istek === null || (istek.hazir !== undefined && !istek.hazir())) return;
    bekleyen.current = null;
    // Beklenen istekte kullanıcı odağı başka yere taşıdıysa odak çekilmez.
    const simdiki = document.activeElement;
    if (
      istek.hazir !== undefined &&
      simdiki !== null &&
      simdiki !== document.body &&
      simdiki !== istek.onceki
    ) {
      return;
    }
    istek.hedef()?.focus();
  });
  return useCallback((hedef: Hedef, hazir?: () => boolean) => {
    bekleyen.current = { hedef, hazir, onceki: document.activeElement };
    setIstek((sayi) => sayi + 1);
  }, []);
};
