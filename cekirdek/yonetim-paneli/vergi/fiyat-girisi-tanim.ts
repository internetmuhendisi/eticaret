// Fiyat girişinin değişikliğinin ekrana giden verisi (kart 0326): tarayıcıdaki ekran yalnız bu türü ve sınırı okur,
// verinin kurulduğu sunucu dosyasını (fiyat-girisi-verisi.ts) içe aktarmaz.
import type { FiyatGirisi } from "../../moduller/vergi/semalar";

// Ekranda gösterilen en çok satır; fazlası CSV'dedir.
export const gosterilenEnCok = 20;

export type FiyatGirisiOnizlemesi = {
  eski: FiyatGirisi;
  yeni: FiyatGirisi;
  surum: string;
  // Kayıtlı tutarı çevrilecek birim sayısı.
  fiyatSayisi: number;
  // Müşterinin gördüğü tutarı 1 kuruş değişecek birimler: sayı ve ilk satırlar.
  degisenSayisi: number;
  degisenler: { birim: string; ad: string; once: string; sonra: string }[];
  // Kayıtlı kargo ücreti ve ücretsiz kargo sınırı, önce ve sonra (giriş biçiminde).
  kargoUcreti: { once: string; sonra: string };
  ucretsizKargoSiniri: { once: string; sonra: string } | null;
  // Tutarı çevrilecek kupon sayısı.
  kuponSayisi: number;
  // Sınır ve kupon tutarlarının çevrildiği sınıfın adı; vergili ürün yoksa yok.
  sepetSinifi: string | null;
};
