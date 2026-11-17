"use client";
// Kartla ödemeden sonra sepetin temizlenmesi (kart 0215). Havale ve kapıda ödemede ödeme formu siparişe giren kalemleri
// sepetten hemen çıkarır; kartla ödemede müşteri ödeme kuruluşundan doğrudan bu sayfaya döner. Sepet yalnız siparişin
// oturumunu başlatan sekmede ve bir kez temizlenir: sayfa sonradan yeniden açılınca yeni sepete dokunmaz.
import { useEffect } from "react";
import { odemeOturumuAnahtari } from "../odeme/kart-donusu";
import { siparisKalemleriniCikar, useSepet } from "../sepet/durum";

export function SepetiTemizle({
  oturum,
  birimler,
}: {
  oturum: string;
  birimler: readonly string[];
}) {
  // Sepet deposundan okununca (hazır) çıkarılır: önce çıkarmak boş sepeti yazardı.
  const { hazir } = useSepet();
  useEffect(() => {
    if (!hazir) return;
    try {
      if (window.sessionStorage.getItem(odemeOturumuAnahtari) !== oturum) return;
      window.sessionStorage.removeItem(odemeOturumuAnahtari);
    } catch {
      return;
    }
    siparisKalemleriniCikar(birimler);
  }, [hazir, oturum, birimler]);
  return null;
}
