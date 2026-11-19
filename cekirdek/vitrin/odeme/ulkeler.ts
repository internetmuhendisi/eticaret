// Sitenin teslimat ülkeleri, il ve ilçe listeleriyle (ödeme adımının adres alanları; kart 0236 ile panelin elle
// siparişi de kullanır). Ülke adı sitenin dilinde.
import type { Site } from "../../ayar-semasi/site-klasoru";
import { postaKoduZorunluMu, ulkeninIlleri } from "../../bolgeler/bolgeler";
import { siteninBicimleyicisi } from "../../metinler/site-metni";
import type { BolgeUlkesi } from "./alanlar";

export const teslimatUlkeleri = (site: Pick<Site, "ayarlar">): BolgeUlkesi[] => {
  const bicim = siteninBicimleyicisi(site.ayarlar);
  return site.ayarlar.teslimatUlkeleri.map((kod) => ({
    kod,
    ad: bicim.ulkeAdi(kod),
    iller: ulkeninIlleri(kod).map((il) => ({
      kod: il.kod,
      ad: il.ad,
      ilceler: il.ilceler.map((ilce) => ({ kod: ilce.kod, ad: ilce.ad })),
    })),
    postaKoduZorunlu: postaKoduZorunluMu(kod),
  }));
};
