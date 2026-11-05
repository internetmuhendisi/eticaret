import type { ReactNode } from "react";
import { hataIzlemeBilgisi } from "../../izleme/hata-izleme-baglantisi";
import { HataIzlemeBaglantisi } from "../../izleme/istemci-hata-izleme";
import { MetinSaglayici } from "../../metinler/istemci-metni";
import { siteDili } from "../../metinler/site-metni";

// Bütün sayfalar sitenin ayarlarına bağlıdır, bu yüzden derlemede değil istekte hazırlanır
// (kart 0035, karar 0026). Site klasörü süreç açılırken bir kez okunur ve bellekte kalır.
export const dynamic = "force-dynamic";

export default function KokDuzen({ children }: { children: ReactNode }) {
  const dil = siteDili();
  // Hata izleme aracı tarayıcıda da bağlanır (kart 0022); adres yoksa hiçbir şey çizilmez.
  const hataIzleme = hataIzlemeBilgisi();
  return (
    <html lang={dil}>
      <body>
        {hataIzleme === undefined ? null : <HataIzlemeBaglantisi bilgi={hataIzleme} />}
        <MetinSaglayici dil={dil}>{children}</MetinSaglayici>
      </body>
    </html>
  );
}
