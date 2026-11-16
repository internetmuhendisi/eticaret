// Kargo ayarları ekranının uç şemaları (kart 0212, karar 0135; kargoya verme süresi kart 0138'in ayarı). Tutarlar sitenin para biçimiyle yazılı gelir
// ("1.250,00"); kuruşa çeviren ve sınırı denetleyen kargo servisidir (kargoAyarlariniDegistir), çünkü biçim sitenin
// ayarıdır. Boş ücretsiz kargo sınırı "sınır yok" demektir.
import { z } from "zod";
import { ucretsizKargoTutarlari } from "../../kayitlar/sepet.ts";

const tutarYazisi = z.string().trim().max(40);

export const kargoAyarlariDurumuSemasi = z.strictObject({});

export const kargoAyarlariSemasi = z.strictObject({
  kargoUcreti: tutarYazisi.min(1),
  ucretsizKargoSiniri: tutarYazisi,
  ucretsizKargoTutari: z.enum(ucretsizKargoTutarlari),
  // İş günü, yazı olarak: sayı olmayan yazı alanın koduyla döner.
  kargoyaVermeSuresi: z.string().trim().min(1).max(10),
});
export type KargoAyarlariGirdisi = z.infer<typeof kargoAyarlariSemasi>;
