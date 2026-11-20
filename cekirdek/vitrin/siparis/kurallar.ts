// Müşterinin sipariş görünüşünün site kuralları (kart 0239): kendi iptali, iade talebi süresi, iade kargosu. Hesaptaki
// ayrıntı, takip ve iade talebi sayfası aynı okumayı kullanır.
import type { Site } from "../../ayar-semasi/site-klasoru";
import { siteninMagazaAyarlari } from "../../moduller/magaza-ayarlari/servis";
import type { MusteriKurallari } from "../../moduller/siparis/musteri";
import type { Veritabani } from "../../veritabani/baglanti";

export const musteriKurallariniOku = async (
  vt: Veritabani,
  site: Site,
): Promise<MusteriKurallari> => {
  const { musteriIptali, iadeTalebiSuresi, iadeKargosu } = await siteninMagazaAyarlari(vt, site);
  return { musteriIptali, iadeTalebiSuresi, iadeKargosu };
};
