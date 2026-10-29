"use client";
// Ekranın bölüm hata sınırı (kart 0014, .claude/rules/hata-izleme.md). Sayfanın kendi başına
// bozulabilecek her bölümü <Bolum> içine alınır; bölümde çıkan hata yalnız o bölümün yerinde
// kısa bir uyarı gösterir, sayfanın geri kalanı çalışmaya devam eder. Next.js'in catchError'ı
// yönlendirme ve bulunamadı sinyallerini yutmaz, sayfa değişince sınırı sıfırlar.
import { catchError, type ErrorInfo } from "next/error";
import { type ReactNode, Suspense, useEffect } from "react";
import { useMetin } from "../metinler/istemci-metni";
import { istemciHatasiniKaydet } from "./istemci-hata-katmani";

// Uyarı bileşeni kütüphaneye gelince bu metin onunla gösterilir.
function BolumHatasi({ hata }: { hata: unknown }) {
  const metin = useMetin();
  useEffect(() => istemciHatasiniKaydet(hata), [hata]);
  return <p role="alert">{metin("ortak.hata.bolumGosterilemiyor")}</p>;
}

const HataSiniri = catchError((_: object, { error }: ErrorInfo) => <BolumHatasi hata={error} />);

// Sunucuda çizilirken hata sınırı çalışmaz; hata bütün sayfayı düşürür. Suspense sınırı hatayı
// bölümde tutar: sunucu bölümü boş gönderir, tarayıcı bölümü yeniden çizer ve hata o zaman
// hata sınırına düşer. Sunucudaki hata ayrıca sunucu günlüğüne yazılır (instrumentation.ts).
export function Bolum({ children }: { children: ReactNode }) {
  return (
    <HataSiniri>
      <Suspense>{children}</Suspense>
    </HataSiniri>
  );
}
