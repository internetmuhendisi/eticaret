import type { ReactNode } from "react";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { hataIzlemeBilgisi } from "../../izleme/hata-izleme-baglantisi";
import { HataIzlemeBaglantisi } from "../../izleme/istemci-hata-izleme";
import { temaDemosu } from "../../kayitlar/tema";
import { MetinSaglayici } from "../../metinler/istemci-metni";
import { siteDili } from "../../metinler/site-metni";
import { sitenTasarimCss } from "../../temalar/birlesim";
import { siteninVeritabani } from "../../veritabani/baglanti";
import { vitrinTemasi } from "../../vitrin/tema-secimi";
import "../stil.css";

// Bütün sayfalar sitenin ayarlarına bağlıdır, bu yüzden derlemede değil istekte hazırlanır
// (kart 0035, karar 0026). Site klasörü süreç açılırken bir kez okunur ve bellekte kalır.
export const dynamic = "force-dynamic";

export default async function KokDuzen({ children }: { children: ReactNode }) {
  const dil = siteDili();
  // Hata izleme aracı tarayıcıda da bağlanır (kart 0022); adres yoksa hiçbir şey çizilmez.
  const hataIzleme = hataIzlemeBilgisi();
  // Tema demosunda (kart 0116) ziyaretçi yalnız gezer: tarayıcıdaki kod oturum sormaz.
  const demo = calisanSite().ayarlar.temaDemosu ? { [temaDemosu.oznitelik]: "" } : {};
  return (
    <html lang={dil} {...demo}>
      <head>
        {/* Sitenin temasının değerleri (kararlar 0076, 0080): sınıflar bu değişkenleri okur. Vitrin temayı
            vitrinTemasi'ndan okur (tema demosunda ziyaretçinin seçtiği tema); panel kendi değerlerini üstüne yazar. */}
        <style>
          {await sitenTasarimCss(() => vitrinTemasi(siteninVeritabani(), calisanSite()))}
        </style>
      </head>
      <body>
        {hataIzleme === undefined ? null : <HataIzlemeBaglantisi bilgi={hataIzleme} />}
        <MetinSaglayici dil={dil}>{children}</MetinSaglayici>
      </body>
    </html>
  );
}
