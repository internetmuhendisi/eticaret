// Numaralı veritabanı değişikliklerini uygulayan tek yol (.claude/rules/veritabani.md, karar 0022).
// Değişiklik dosyaları drizzle-kit ile tablolar/ klasöründen üretilir (pnpm veritabani-degisikligi-uret).
// Hangi değişikliklerin uygulandığını veritabanı kendi tablosunda tutar, bu yüzden aynı
// değişiklik iki kez uygulanmaz.
// Komutlar bu dosyayı Node ile doğrudan çalıştırdığı için veritabani/ dosyaları birbirini
// .ts uzantısıyla alır.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Veritabani } from "./baglanti.ts";
import { uygulananDegisiklikTablosu } from "./degisiklik-ayari.ts";
import { veritabaniKimligi } from "./tablolar/veritabani-kimligi.ts";

// drizzle.config.ts aynı klasörü gösterir; bunu bir test denetler.
export const degisiklikKlasoru = join(import.meta.dirname, "degisiklikler");

// Her değişiklik dosyasının ilk satırı geri dönüş notudur, örneğin:
// -- Geri dönüş: geri alınabilir. Tablo silinerek geri alınır.
// -- Geri dönüş: yedekten. Silinen sütunun verisi yalnız yedekte kalır.
const geriDonusNotu = /^-- Geri dönüş: (geri alınabilir|yedekten)(\.|$)/;

// İlk satırında geri dönüş notu olmayan .sql dosyalarının adları.
export const notuOlmayanlar = (klasor: string): string[] =>
  readdirSync(klasor)
    .filter((ad) => ad.endsWith(".sql"))
    .filter((ad) => {
      const [ilkSatir = ""] = readFileSync(join(klasor, ad), "utf8").split("\n");
      return !geriDonusNotu.test(ilkSatir.trim());
    })
    .sort();

// Notu olmayan bir değişiklik varsa hiçbirini uygulamaz.
export const degisiklikleriUygula = async (veritabani: Veritabani): Promise<void> => {
  const notsuzlar = notuOlmayanlar(degisiklikKlasoru);
  if (notsuzlar.length > 0) {
    throw new Error(
      `Geri dönüş notu olmayan değişiklik uygulanmaz: ${notsuzlar.join(", ")}. İlk satıra "-- Geri dönüş: geri alınabilir." ya da "-- Geri dönüş: yedekten." yazın.`,
    );
  }
  await migrate(veritabani, {
    migrationsFolder: degisiklikKlasoru,
    migrationsTable: uygulananDegisiklikTablosu.tablo,
    migrationsSchema: uygulananDegisiklikTablosu.sema,
  });
};

export const uygulananDegisiklikSayisi = async (veritabani: Veritabani): Promise<number> => {
  const { tablo, sema } = uygulananDegisiklikTablosu;
  const tabloVar = await veritabani.execute<{ var: boolean }>(
    sql`select to_regclass(${`${sema}.${tablo}`}) is not null as var`,
  );
  if (!tabloVar.rows[0]?.var) return 0;
  const sonuc = await veritabani.execute<{ sayi: number }>(
    sql`select count(*)::int as sayi from ${sql.identifier(sema)}.${sql.identifier(tablo)}`,
  );
  return sonuc.rows[0]?.sayi ?? 0;
};

const kayitliSiteler = async (veritabani: Veritabani): Promise<string[]> => {
  const tabloVar = await veritabani.execute<{ var: boolean }>(
    sql`select to_regclass('public.veritabani_kimligi') is not null as var`,
  );
  if (!tabloVar.rows[0]?.var) return [];
  const satirlar = await veritabani
    .select({ kodAdi: veritabaniKimligi.site_kod_adi })
    .from(veritabaniKimligi);
  return satirlar.map((satir) => satir.kodAdi);
};

const baskaSiteninMi = (siteler: string[], kodAdi: string): boolean =>
  siteler.some((kayitli) => kayitli !== kodAdi);

// Bir sitenin veritabanını günceller. Veritabanı başka bir siteye aitse hiçbir şey uygulamaz.
// İlk güncellemede veritabanına sitenin kod adını yazar.
export const siteVeritabaniniGuncelle = async (
  veritabani: Veritabani,
  kodAdi: string,
): Promise<{ once: number; sonra: number }> => {
  const onceki = await kayitliSiteler(veritabani);
  if (baskaSiteninMi(onceki, kodAdi)) {
    throw new Error(
      `Bu veritabanı başka bir siteye ait (${onceki.join(", ")}), ${kodAdi} için güncellenmez.`,
    );
  }
  const once = await uygulananDegisiklikSayisi(veritabani);
  await degisiklikleriUygula(veritabani);
  await veritabani.insert(veritabaniKimligi).values({ site_kod_adi: kodAdi }).onConflictDoNothing();
  const sonra = await uygulananDegisiklikSayisi(veritabani);
  return { once, sonra };
};
