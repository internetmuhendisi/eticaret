// Teslimatın sitenin ayarlarına bağlı kuralları (kart 0213; kart 0237 ile ödeme servisinden ayrıldı): telefonun
// zorunluluğu mağaza ayarıdır (telefonZorunlu), adres sitenin teslimat ülkelerinden birinde olmalıdır. Şema yalnız
// biçimi denetler (teslimat-semasi.ts). Ödeme adımı ve müşterinin adres defteri aynı işlevi kullanır.
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import type { Teslimat } from "./teslimat-semasi.ts";

// Kuralı tutmayan alan (teslimatın içindeki yol) ve hata kodu; tutuyorsa undefined.
export const teslimatKuraliHatasi = (
  site: Pick<Site, "ayarlar">,
  ayarlar: { telefonZorunlu: boolean },
  teslimat: Teslimat,
): { alan: string; kod: string } | undefined => {
  if (ayarlar.telefonZorunlu && teslimat.telefon === undefined) {
    return { alan: "telefon", kod: "telefon-gerekli" };
  }
  if (!site.ayarlar.teslimatUlkeleri.includes(teslimat.adres.ulke)) {
    return { alan: "adres.ulke", kod: "ulke-teslimat-disi" };
  }
  return undefined;
};
