// Sepetin girdi şeması (kart 0212, karar 0135). Ekran (tarayıcıdaki sepet) ve kapı aynı şemayı kullanır.
// Sepet tarayıcıdadır: sunucuya yalnız birimler, adetler ve müşterinin son gördüğü birim fiyatı gelir; tutar
// gelmez, sunucu her şeyi yeniden hesaplar.
import { z } from "zod";
import { kuponSinirlari } from "../../kayitlar/kampanya.ts";
import { sepetSinirlari } from "../../kayitlar/sepet.ts";
import { kimlikSemasi } from "../../veritabani/kimlik.ts";

export const sepetKalemiSemasi = z.strictObject({
  birim: kimlikSemasi,
  adet: z.int().min(1).max(sepetSinirlari.adetEnCok),
  // Müşterinin bu birim için son gördüğü birim fiyatı (gösterim biçiminde, kuruş): fiyat değiştiyse söylenir.
  gorulenTutar: z.int().min(0).optional(),
});
export type SepetKalemi = z.output<typeof sepetKalemiSemasi>;

// Ödeme adımında vergi müşterinin adresine göre hesaplanır (kart 0213): teslimat ve fatura adresinin bölgesi gelir,
// hangisinin kullanılacağı vergiAdresi ayarıdır. Bölge vergi tablosunda yoksa mağaza adresi kullanılır (karar 0061);
// bu yüzden burada yalnız biçim denetlenir.
const bolgeMetni = z.string().trim().min(1).max(20);
export const vergiBolgesiSemasi = z.strictObject({
  ulke: bolgeMetni,
  il: bolgeMetni.optional(),
  postaKodu: bolgeMetni.optional(),
});
export const vergiBolgeleriSemasi = z.strictObject({
  teslimat: vergiBolgesiSemasi.optional(),
  fatura: vergiBolgesiSemasi.optional(),
});
export type VergiBolgeleri = z.output<typeof vergiBolgeleriSemasi>;

// Müşterinin sepette yazdığı kupon kodu (kart 0312): biçimi burada yalnız uzunlukla sınırlanır; biçimi tutmayan kod
// kampanya modülünde "bulunamadı" sayılır (kodun var olup olmadığı belli olmaz).
export const kuponKoduSemasi = z.string().trim().min(1).max(kuponSinirlari.kodEnCok);

export const sepetSemasi = z.strictObject({
  kalemler: z.array(sepetKalemiSemasi).max(sepetSinirlari.kalemEnCok),
  vergiBolgeleri: vergiBolgeleriSemasi.optional(),
  kupon: kuponKoduSemasi.optional(),
});
