// Numaralı veritabanı değişikliklerini uygulayan tek yol (.claude/rules/veritabani.md, karar 0022).
// Değişiklik dosyaları drizzle-kit ile tablolar/ klasöründen üretilir (pnpm veritabani-degisikligi-uret).
// Hangi değişikliklerin uygulandığını veritabanı kendi tablosunda tutar, bu yüzden aynı
// değişiklik iki kez uygulanmaz. Drizzle bir değişikliği yalnız zamanı son uygulanandan yeniyse
// uygular ve içeriği karşılaştırmaz; sırası kaymış bir değişiklik sessizce atlanırdı. Bu yüzden
// uygulamadan önce sıra ve uygulanmış değişikliklerin içeriği burada denetlenir.
// Komutlar bu dosyayı Node ile doğrudan çalıştırdığı için veritabani/ dosyaları birbirini
// .ts uzantısıyla alır.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { readMigrationFiles } from "drizzle-orm/migrator";
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

// Değişikliklerin geri dönüş notları, uygulanma sırasıyla (yayın komutu geri dönüşte okur).
// Notu olmayan değişiklik "notsuz" sayılır; böyle bir değişiklik zaten uygulanmaz.
export type GeriDonusNotu = "geri alınabilir" | "yedekten" | "notsuz";
export const geriDonusNotlari = (klasor: string): GeriDonusNotu[] => {
  const liste = JSON.parse(readFileSync(join(klasor, "meta", "_journal.json"), "utf8")) as {
    entries: { tag: string }[];
  };
  return liste.entries.map(({ tag }) => {
    const [ilkSatir = ""] = readFileSync(join(klasor, `${tag}.sql`), "utf8").split("\n");
    const not = ilkSatir.trim().match(geriDonusNotu)?.[1];
    return not === "geri alınabilir" || not === "yedekten" ? not : "notsuz";
  });
};

export type DegisiklikDosyasi = { ad: string; zaman: number; ozet: string };
export type UygulananDegisiklik = { ozet: string };

// Değişiklik dosyaları, aracın kayıt listesindeki (meta/_journal.json) sırayla. Özet, dosya
// içeriğinin SHA-256 özetidir; Drizzle uygulanan değişikliği bu özetle kaydeder.
export const degisiklikDosyalari = (klasor: string): DegisiklikDosyasi[] => {
  const liste = JSON.parse(readFileSync(join(klasor, "meta", "_journal.json"), "utf8")) as {
    entries: { tag: string; when: number }[];
  };
  const dosyalar = readMigrationFiles({ migrationsFolder: klasor });
  return liste.entries.map((girdi, sira) => ({
    ad: girdi.tag,
    zaman: girdi.when,
    ozet: dosyalar[sira]?.hash ?? "",
  }));
};

// Her değişikliğin zamanı bir öncekinden yeni olmalı, yoksa Drizzle onu atlar.
export const siraHatalari = (dosyalar: Omit<DegisiklikDosyasi, "ozet">[]): string[] =>
  dosyalar.flatMap((dosya, sira) => {
    const onceki = dosyalar[sira - 1];
    return onceki && dosya.zaman <= onceki.zaman
      ? [
          `${dosya.ad}: zamanı bir önceki değişiklikten (${onceki.ad}) eski. Bu dosyayı silip değişikliği yeniden üretin.`,
        ]
      : [];
  });

// Veritabanında uygulanmış değişiklikler, dosyaların ilk aynı sayıdakiyle birebir aynı olmalı.
export const kayitHatalari = (
  dosyalar: DegisiklikDosyasi[],
  uygulananlar: UygulananDegisiklik[],
): string[] =>
  uygulananlar.flatMap((uygulanan, sira) => {
    const dosya = dosyalar[sira];
    if (!dosya) {
      return [
        `Veritabanında dosyası olmayan ${sira + 1}. değişiklik uygulanmış. Site daha yeni bir çekirdek sürümüyle güncellenmiş olabilir.`,
      ];
    }
    return dosya.ozet === uygulanan.ozet
      ? []
      : [
          `${dosya.ad}: uygulandıktan sonra içeriği değişmiş ya da sırası kaymış. Uygulanmış değişiklik değiştirilmez, yeni bir değişiklik üretin.`,
        ];
  });

const tabloVarMi = async (veritabani: Veritabani, tamAd: string): Promise<boolean> => {
  const sonuc = await veritabani.execute<{ var: boolean }>(
    sql`select to_regclass(${tamAd}) is not null as var`,
  );
  return sonuc.rows[0]?.var ?? false;
};

// Uygulanan değişiklikler, uygulanma sırasıyla.
export const uygulananDegisiklikler = async (
  veritabani: Veritabani,
): Promise<UygulananDegisiklik[]> => {
  const { tablo, sema } = uygulananDegisiklikTablosu;
  if (!(await tabloVarMi(veritabani, `${sema}.${tablo}`))) return [];
  const sonuc = await veritabani.execute<{ ozet: string }>(
    sql`select hash as ozet from ${sql.identifier(sema)}.${sql.identifier(tablo)} order by created_at, id`,
  );
  return sonuc.rows;
};

// Notu olmayan, sırası bozuk ya da uygulanmış hâli değişmiş bir değişiklik varsa hiçbirini uygulamaz.
export const degisiklikleriUygula = async (veritabani: Veritabani): Promise<void> => {
  const notsuzlar = notuOlmayanlar(degisiklikKlasoru);
  if (notsuzlar.length > 0) {
    throw new Error(
      `Geri dönüş notu olmayan değişiklik uygulanmaz: ${notsuzlar.join(", ")}. İlk satıra "-- Geri dönüş: geri alınabilir." ya da "-- Geri dönüş: yedekten." yazın.`,
    );
  }
  const dosyalar = degisiklikDosyalari(degisiklikKlasoru);
  const hatalar = [
    ...siraHatalari(dosyalar),
    ...kayitHatalari(dosyalar, await uygulananDegisiklikler(veritabani)),
  ];
  if (hatalar.length > 0) {
    throw new Error(`Değişiklikler uygulanmadı:\n${hatalar.join("\n")}`);
  }
  await migrate(veritabani, {
    migrationsFolder: degisiklikKlasoru,
    migrationsTable: uygulananDegisiklikTablosu.tablo,
    migrationsSchema: uygulananDegisiklikTablosu.sema,
  });
};

const kayitliSiteler = async (veritabani: Veritabani): Promise<string[]> => {
  if (!(await tabloVarMi(veritabani, "public.veritabani_kimligi"))) return [];
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
  const once = (await uygulananDegisiklikler(veritabani)).length;
  await degisiklikleriUygula(veritabani);
  await veritabani.insert(veritabaniKimligi).values({ site_kod_adi: kodAdi }).onConflictDoNothing();
  const sonra = (await uygulananDegisiklikler(veritabani)).length;
  return { once, sonra };
};
