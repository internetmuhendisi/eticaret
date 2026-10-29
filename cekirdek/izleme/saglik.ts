// Sitenin sağlık durumu (kart 0013). Yayın komutu ve zamanlanmış kontroller siteyi bununla
// yoklar. Yalnız parçaların durumunu ve çekirdek sürümünü söyler, kişisel veri döndürmez.
import { sql } from "drizzle-orm";
import { BilinenHata } from "../kapi/zarf.ts";
import type { ParcaDurumu } from "../kayitlar/izleme.ts";
import { cekirdekSurumu } from "../surum.ts";
import { siteninVeritabani, type Veritabani } from "../veritabani/baglanti.ts";

export type SaglikDurumu = {
  uygulama: ParcaDurumu;
  veritabani: ParcaDurumu;
  cekirdekSurumu: string;
};

// Veritabanına ulaşılamazsa "hizmet-kullanilamiyor" hatası verir; ayrıntıda hangi parçanın
// kapalı olduğu yazar.
export const saglikDurumu = async (
  veritabani: () => Veritabani = siteninVeritabani,
): Promise<SaglikDurumu> => {
  try {
    await veritabani().execute(sql`select 1`);
  } catch (hata) {
    // Hata kaydı kart 0014'te ortak hata katmanına gider.
    console.error(hata);
    throw new BilinenHata("hizmet-kullanilamiyor", {
      uygulama: "ayakta",
      veritabani: "kapali",
      cekirdekSurumu,
    } satisfies SaglikDurumu);
  }
  return { uygulama: "ayakta", veritabani: "ayakta", cekirdekSurumu };
};
