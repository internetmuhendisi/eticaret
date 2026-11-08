// Ürün servisinin ve varyant işlemlerinin ortak doğrulama parçaları (kart 0076, kart 0085): hata
// biçimi, şemadan geçirme ve stok kodu tekilliği. Hata, her sorunun alanı ve koduyla döner (vergi
// modülüyle aynı biçim).
import { and, isNull, ne, sql } from "drizzle-orm";
import type { z } from "zod";
import { BilinenHata } from "../../kapi/zarf.ts";
import type { VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { urunBirimleri } from "./model.ts";
import { type UrunHatasi, urunHatalari } from "./semalar.ts";

export type Sorun = { alan: string; kod: string };
export const dogrulamaHatasi = (sorunlar: Sorun[]) => new BilinenHata("dogrulama", sorunlar);
export const cakisma = (alan: string, kod: UrunHatasi) =>
  new BilinenHata("cakisma", [{ alan, kod }]);
export const isKurali = (alan: string, kod: UrunHatasi) =>
  new BilinenHata("is-kurali", [{ alan, kod }]);

// Şemadan geçmeyen girdi doğrulama hatasıdır.
const bilinenKodlar = new Set<string>(urunHatalari);
export const girdiyiDogrula = <T>(sonuc: z.ZodSafeParseResult<T>): T => {
  if (sonuc.success) return sonuc.data;
  throw dogrulamaHatasi(
    sonuc.error.issues.map((sorun) => ({
      alan: sorun.path.join("."),
      kod: bilinenKodlar.has(sorun.message) ? sorun.message : sorun.code,
    })),
  );
};

// Kilit altında: silinmemiş başka bir birim bu stok kodunu (büyük küçük harf ayrımsız) taşıyor mu?
// Basit ürünün birimi ve varyantlı ürünün birleşimleri aynı kuralı kullanır.
export const stokKoduKullaniliyor = async (
  islem: VeritabaniIslemi,
  stokKodu: string,
  haricBirim?: string,
) => {
  const bulunan = await islem
    .select({ kimlik: urunBirimleri.kimlik })
    .from(urunBirimleri)
    .where(
      and(
        sql`lower(${urunBirimleri.stok_kodu}) = lower(${stokKodu})`,
        isNull(urunBirimleri.silinme_zamani),
        haricBirim === undefined ? undefined : ne(urunBirimleri.kimlik, haricBirim),
      ),
    );
  return bulunan.length > 0;
};

// Değişiklik kaydına giden değer: boş alan yazılmaz, zaman ISO metnidir. Boş liste eklemede ve silmede
// yazılmaz; değişiklikte yazılır (listenin boşaldığı görünsün).
export const kayitDegeri = (
  kayit: Record<string, unknown>,
  bosListe = false,
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(kayit)
      .filter(
        ([, deger]) =>
          deger !== null &&
          deger !== undefined &&
          (bosListe || !(Array.isArray(deger) && deger.length === 0)),
      )
      .map(([alan, deger]) => [alan, deger instanceof Date ? deger.toISOString() : deger]),
  );
