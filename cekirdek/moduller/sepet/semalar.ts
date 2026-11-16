// Sepetin girdi şeması (kart 0212, karar 0135). Ekran (tarayıcıdaki sepet) ve kapı aynı şemayı kullanır.
// Sepet tarayıcıdadır: sunucuya yalnız birimler, adetler ve müşterinin son gördüğü birim fiyatı gelir; tutar
// gelmez, sunucu her şeyi yeniden hesaplar.
import { z } from "zod";
import { sepetSinirlari } from "../../kayitlar/sepet.ts";
import { kimlikSemasi } from "../../veritabani/kimlik.ts";

export const sepetKalemiSemasi = z.strictObject({
  birim: kimlikSemasi,
  adet: z.int().min(1).max(sepetSinirlari.adetEnCok),
  // Müşterinin bu birim için son gördüğü birim fiyatı (gösterim biçiminde, kuruş): fiyat değiştiyse söylenir.
  gorulenTutar: z.int().min(0).optional(),
});
export type SepetKalemi = z.output<typeof sepetKalemiSemasi>;

export const sepetSemasi = z.strictObject({
  kalemler: z.array(sepetKalemiSemasi).max(sepetSinirlari.kalemEnCok),
});
