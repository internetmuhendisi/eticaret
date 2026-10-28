// Veritabanı testlerinin bağlantı adresleri. Sunucu ve port sitenin adresinden (VERITABANI_ADRESI)
// alınır, kullanıcı ve veritabanı değişir.
import { veritabaniAdresi } from "../baglanti";

export const adres = (kullanici: string, sifre: string, veritabani: string): string => {
  const sonuc = new URL(veritabaniAdresi());
  sonuc.username = kullanici;
  sonuc.password = sifre;
  sonuc.pathname = `/${veritabani}`;
  return sonuc.href;
};

// Yönetici kullanıcısıyla verilen veritabanının adresi.
export const yoneticiAdresi = (veritabani: string): string => {
  const { VERITABANI_YONETICI_SIFRESI: sifre } = process.env;
  if (!sifre) throw new Error("VERITABANI_YONETICI_SIFRESI ortam değişkeni yok.");
  return adres("postgres", sifre, veritabani);
};
