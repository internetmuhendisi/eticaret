// Ödeme oturumlarının temizliği (kart 0213, karar 0140). Arka plan süreci yükler: ödeme servisinin bağımlılıklarını
// (sepet hesabı, vitrin metinleri) çekmemek için ayrı dosyadadır.
import { lte, sql } from "drizzle-orm";
import { odemeOturumuSaklamaSaat } from "../../kayitlar/odeme.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { odemeOturumlari } from "./model.ts";

// Süresi dolup saklama süresini de geçen oturumlar silinir (kişisel veri taşır); ayırmaları onunla gider. Siparişe
// dönen oturumun kuralı kart 0214'tedir.
export const eskiOdemeOturumlariniSil = async (vt: Veritabani): Promise<number> => {
  const silinen = await vt
    .delete(odemeOturumlari)
    .where(
      lte(
        odemeOturumlari.bitis_zamani,
        sql`now() - make_interval(hours => ${odemeOturumuSaklamaSaat})`,
      ),
    )
    .returning({ kimlik: odemeOturumlari.kimlik });
  return silinen.length;
};
