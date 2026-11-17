// Ödeme oturumlarının temizliği (kart 0213, karar 0140). Arka plan süreci yükler: ödeme servisinin bağımlılıklarını
// (sepet hesabı, vitrin metinleri) çekmemek için ayrı dosyadadır.
import { and, lte, sql } from "drizzle-orm";
import { odemeOturumuSaklamaSaat } from "../../kayitlar/odeme.ts";
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
        lte(
          odemeOturumlari.bitis_zamani,
          sql`now() - make_interval(hours => ${odemeOturumuSaklamaSaat})`,
        ),
        sql`not exists (select 1 from ${siparisler} where ${siparisler.oturum_kimligi} = ${odemeOturumlari.kimlik})`,
      ),
    )
    .returning({ kimlik: odemeOturumlari.kimlik });
  return silinen.length;
};
