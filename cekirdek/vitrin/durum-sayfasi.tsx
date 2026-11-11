// Vitrinin "bulunamadı" ve hata sayfasının ortak iskeleti (kart 0120, karar 0102; Canlı Çarşı taslağı): ortalanmış
// sütunda üstte işaret (404 ya da ikon), sayfanın tek h1'i, soluk açıklama ve düğmeler. Metinleri sayfa verir.
// Sunucuda ve tarayıcıda çizilir: hata sayfası tarayıcı bileşenidir.
import type { ReactNode } from "react";
import { SayfaBasligi } from "../../bilesenler/parcalar/sayfa-basligi";

export function DurumSayfasi({
  isaret,
  baslik,
  aciklama,
  children,
}: {
  // Başlığın üstündeki işaret; ekran okuyucudan gizlidir, anlamı başlıktadır.
  isaret: ReactNode;
  baslik: string;
  aciklama: string;
  // Düğmeler.
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-form flex-col items-center gap-4 px-4 pt-12 pb-6 text-center">
      <span aria-hidden="true" className="flex flex-col items-center">
        {isaret}
      </span>
      <SayfaBasligi baslik={baslik} className="justify-center" />
      <p className="text-soluk-yazi">{aciklama}</p>
      <div className="flex flex-wrap justify-center gap-2">{children}</div>
    </div>
  );
}
