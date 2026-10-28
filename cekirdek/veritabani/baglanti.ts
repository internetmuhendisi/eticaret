// Sitenin veritabanı bağlantısı (karar 0022). Adres yalnız VERITABANI_ADRESI ortam
// değişkeninden okunur; şifre .env dosyasında ya da sunucunun korumalı değişkenlerinde durur.
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";

export type Veritabani = NodePgDatabase & { $client: import("pg").Pool };

let veritabani: Veritabani | undefined;

export const veritabaniAdresi = (): string => {
  const { VERITABANI_ADRESI: adres } = process.env;
  if (!adres) {
    throw new Error(
      "VERITABANI_ADRESI ortam değişkeni yok. Değişkenin biçimi .env.example dosyasında yazar.",
    );
  }
  return adres;
};

export const baglan = (adres: string): Veritabani => drizzle({ connection: adres });

// Uygulamanın tek bağlantısı. İlk kullanımda açılır.
export const siteninVeritabani = (): Veritabani => {
  veritabani ??= baglan(veritabaniAdresi());
  return veritabani;
};

export const baglantiyiKapat = async (): Promise<void> => {
  await veritabani?.$client.end();
  veritabani = undefined;
};

// Sitenin veritabanının ve veritabanı kullanıcısının adı: site_<kod adı>, tire alt çizgi olur.
export const siteVeritabaniAdi = (kodAdi: string): string => `site_${kodAdi.replaceAll("-", "_")}`;
