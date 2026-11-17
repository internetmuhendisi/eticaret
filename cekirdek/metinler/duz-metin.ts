// Müşterinin yazdığı düz metnin ortak şeması (kartlar 0139, 0213): kırpılır, NFC'ye çevrilir; satır sonu ve sekme
// dışındaki denetim karakterleri "metin-gecersiz" ile reddedilir. HTML ya da bağlantı ayıklanmaz: düz metin hiçbir
// yerde HTML olarak çizilmez (vitrin yazı olarak çizer). Yorum ve ödeme formu aynı kuralı kullanır.
import { z } from "zod";

// Satır sonu ve sekme serbest, öteki denetim karakterleri değil (bölüm tarifinin uzun metniyle aynı kural).
const denetimKarakteri = /[^\P{Cc}\n\r\t]/u;

export const duzMetinSemasi = (enCok: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(enCok)
    .refine((deger) => !denetimKarakteri.test(deger), "metin-gecersiz")
    .transform((deger) => deger.normalize("NFC"));
