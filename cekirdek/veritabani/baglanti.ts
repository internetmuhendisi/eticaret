// Sitenin veritabanı bağlantısı (karar 0022). Adres gizli bilgidir ve yalnız gizliBilgi() ile
// okunur: bilgisayarda .env'deki VERITABANI_ADRESI, sunucuda gizli bilgi dosyası (karar 0031).
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { gizliBilgi } from "../ayar-semasi/gizli-bilgi.ts";
import { hatayiKaydet } from "../izleme/hata-katmani.ts";

export type Veritabani = NodePgDatabase & { $client: import("pg").Pool };

let veritabani: Veritabani | undefined;

export const veritabaniAdresi = (): string => gizliBilgi("VERITABANI_ADRESI");

// Veritabanına ulaşılamazsa istek bu süreden sonra hatayla biter, uygulama beklemede kalmaz.
const baglantiZamanAsimi = 5_000;

export const baglan = (adres: string): Veritabani => {
  const veritabani = drizzle({
    connection: { connectionString: adres, connectionTimeoutMillis: baglantiZamanAsimi },
  });
  // Veritabanı kapanınca boştaki bağlantılar hata verir. Dinleyici olmazsa bu hata uygulamayı
  // düşürür; dinleyiciyle bağlantı atılır, sonraki istek yeniden bağlanmayı dener.
  veritabani.$client.on("error", (hata) => hatayiKaydet(hata, { kaynak: "veritabani-havuzu" }));
  return veritabani;
};

// Bağlantı havuzu. İlk kullanımda açılır. Next.js ara katmanı ayrı pakettir, kendi havuzunu açar
// (karar 0042).
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
