// Ödeme oturumlarının temizliği (kart 0213, karar 0140). Arka plan süreci yükler: ödeme servisinin bağımlılıklarını
// (sepet hesabı, vitrin metinleri) çekmemek için ayrı dosyadadır.
import { and, eq, lte, or, sql } from "drizzle-orm";
import { odemeOturumuDisaridaSaklamaGun, odemeOturumuSaklamaSaat } from "../../kayitlar/odeme.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { siparisler } from "../siparis/model.ts";
import { odemeOturumlari } from "./model.ts";

// Süresi dolup saklama süresini de geçen oturumlar silinir (kişisel veri taşır); ayırmaları onunla gider. Siparişe
// dönen oturum silinmez (kart 0214): sipariş ona bağlıdır, aynı oturumdan ikinci sipariş kurulmaması onunla denetlenir.
export const eskiOdemeOturumlariniSil = async (vt: Veritabani): Promise<number> => {
  const silinen = await vt
    .delete(odemeOturumlari)
    .where(
      and(
        // Ödemesi dışarıda başlamış oturum daha uzun kalır (kart 0215).
        or(
          and(
            eq(odemeOturumlari.odeme_disarida, false),
            lte(
              odemeOturumlari.bitis_zamani,
              sql`now() - make_interval(hours => ${odemeOturumuSaklamaSaat})`,
            ),
          ),
          lte(
            odemeOturumlari.bitis_zamani,
            sql`now() - make_interval(days => ${odemeOturumuDisaridaSaklamaGun})`,
          ),
        ),
        sql`not exists (select 1 from ${siparisler} where ${siparisler.oturum_kimligi} = ${odemeOturumlari.kimlik})`,
      ),
    )
    .returning({ kimlik: odemeOturumlari.kimlik });
  return silinen.length;
};
