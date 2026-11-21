"use client";
// Açılır menüden pencere açmak (kart 0143; kart 0261'de menüler ekranından ortak dosyaya taşındı): pencere, menü kapanıp odağı kendi düğmesine verdikten sonra açılır. Menü kapanırken
// odağı geri vermesi pencereyle çakışmasın, pencere kapanınca da odak menünün düğmesine dönsün (ölçüldü: aynı anda
// açılınca ikinci açılışta menü takılıyordu).
import { useRef } from "react";

export const useMenudenPencere = () => {
  const bekleyen = useRef<(() => void) | null>(null);
  return {
    sec: (ac: () => void) => () => {
      bekleyen.current = ac;
    },
    kapaninca: () => {
      const ac = bekleyen.current;
      bekleyen.current = null;
      ac?.();
    },
  };
};
