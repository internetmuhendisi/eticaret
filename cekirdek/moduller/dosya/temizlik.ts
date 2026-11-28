// Sitenin dosya temizliği (kart 0093, karar 0207). Arka plan sürecinde günde bir kez çalışır
// (cekirdek/arka-plan-isleri/isler.ts). Sitenin kendi kullanıcısıyla, kendi klasöründe çalışır; değerleri
// dosyaTemizligiAyari'ndadır.
//
// - Hiçbir kaydın kullanmadığı fatura belgesi (kart 0268) bir gün sonra silinmiş işaretlenir: ad ve adres taşır.
// - Silinmiş işaretli dosya kaliciSilmeGun sonra diskten silinir; kaydı iz olarak kalır. Bu süre yedeğin saklama
//   süresinden uzundur: geri yüklenen bir veritabanı yedeği dosyayı silinmemiş gösterebilir, kopyası depodadır.
// - Kaydı olmayan dosya (süreç kaydederken ölmüş, geri yükleme yarıda kalmış) silinmez, bildirilir.
// - Kaydı olup diskte olmayan silinmemiş dosya bildirilir: veri kaybıdır.
// - Kullanılmayan silinmemiş dosya (hiçbir kaydın başvurmadığı görsel) yalnız sayılır, işaretlenmez: yanlış bir
//   "kullanılmıyor" kararı görseli hemen kapatırdı. Galeriden, kategoriden kaldırılan görsel bugün işaretsiz kalır.
import { readdir, stat, unlink } from "node:fs/promises";
import { join } from "node:path";
import { and, inArray, isNull, lt, sql } from "drizzle-orm";
import { belgeTurleri, dosyaTemizligiAyari, kayitliDosyaTurleri } from "../../kayitlar/dosya.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { dosyaBoyutlari, dosyalar } from "./model.ts";

export type DosyaTemizligiSonucu = {
  isaretlenenBelge: number;
  kaliciSilinen: number;
  kayitsiz: string[];
  eksik: string[];
  kullanilmayan: number;
};

const gunMs = 24 * 60 * 60 * 1000;
const uzanti = (tur: string): string | undefined =>
  (kayitliDosyaTurleri as Record<string, { uzanti: string }>)[tur]?.uzanti;

// Bir dosyaya başvuran bütün sütunlar: dosyalar tablosuna giden yabancı anahtarlar (yeni tablo kendiliğinden girer)
// ve kimliği değerinde taşıyan iki JSON alanı: mağaza ayarları (logo) ve düzenin bütün sürümleri (geri dönülebilir).
// Görselin boyutları (dosya_boyutlari) kaynağa bağlıdır, kullanım sayılmaz: boyut, kaynağı kullanılırken kullanılır.
const kullanilanlar = async (vt: Veritabani | VeritabaniIslemi): Promise<Set<string>> => {
  const sutunlar = await vt.execute<{ sema: string; tablo: string; sutun: string }>(sql`
    select n.nspname as sema, t.relname as tablo, a.attname as sutun
    from pg_catalog.pg_constraint c
    join pg_catalog.pg_class t on t.oid = c.conrelid
    join pg_catalog.pg_namespace n on n.oid = t.relnamespace
    join pg_catalog.pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.contype = 'f' and c.confrelid = 'public.dosyalar'::regclass
      and c.conrelid <> 'public.dosya_boyutlari'::regclass`);
  const kimlikler = new Set<string>();
  for (const { sema, tablo, sutun } of sutunlar.rows) {
    const satirlar = await vt.execute<{ k: string }>(
      sql`select distinct ${sql.identifier(sutun)}::text as k from ${sql.identifier(sema)}.${sql.identifier(tablo)} where ${sql.identifier(sutun)} is not null`,
    );
    for (const { k } of satirlar.rows) kimlikler.add(k);
  }
  return kimlikler;
};

// Kimliği JSON değerlerinde geçen dosyalar. Tablolar küçüktür (ayar sayısı, düzen sürümü sayısı).
const jsondaGecenler = async (
  vt: Veritabani | VeritabaniIslemi,
  adaylar: string[],
): Promise<Set<string>> => {
  if (adaylar.length === 0) return new Set();
  const metinler = await vt.execute<{ m: string }>(sql`
    select deger::text as m from public.magaza_ayarlari where deger is not null
    union all select duzen::text from public.duzen_surumleri`);
  const hepsi = metinler.rows.map((s) => s.m).join("\n");
  return new Set(adaylar.filter((k) => hepsi.includes(k)));
};

export const dosyaTemizligi = async (
  vt: Veritabani,
  klasor: string,
  simdi: Date = new Date(),
): Promise<DosyaTemizligiSonucu> => {
  const ayar = dosyaTemizligiAyari;
  const kullanilan = await kullanilanlar(vt);

  // Sahipsiz fatura belgeleri.
  const belgeler = await vt
    .select({ kimlik: dosyalar.kimlik })
    .from(dosyalar)
    .where(
      and(
        isNull(dosyalar.silinme_zamani),
        inArray(dosyalar.tur, Object.keys(belgeTurleri)),
        lt(
          dosyalar.olusturma_zamani,
          new Date(simdi.getTime() - ayar.sahipsizBelgeSaat * 3_600_000),
        ),
      ),
    );
  const adaylar0 = belgeler.map((b) => b.kimlik).filter((k) => !kullanilan.has(k));
  // İşaretleme kendi işleminde: satırlar kilitlenir, kullanım kilitten sonra yeniden okunur. Belgeyi bağlayan açık bir
  // işlem (fatura, paylaşımlı kilit) bitene kadar beklenir ve onun bağı görülür (kart 0093).
  const isaretlenecek =
    adaylar0.length === 0
      ? []
      : await vt.transaction(async (islem) => {
          const kilitli = await islem
            .select({ kimlik: dosyalar.kimlik })
            .from(dosyalar)
            .where(and(inArray(dosyalar.kimlik, adaylar0), isNull(dosyalar.silinme_zamani)))
            .orderBy(dosyalar.kimlik)
            .for("update");
          const simdiKullanilan = await kullanilanlar(islem);
          const json = await jsondaGecenler(
            islem,
            kilitli.map((s) => s.kimlik),
          );
          const secilen = kilitli
            .map((s) => s.kimlik)
            .filter((k) => !simdiKullanilan.has(k) && !json.has(k));
          if (secilen.length > 0) {
            await islem
              .update(dosyalar)
              .set({ silinme_zamani: simdi })
              .where(inArray(dosyalar.kimlik, secilen));
          }
          return secilen;
        });

  const satirlar = await vt
    .select({
      kimlik: dosyalar.kimlik,
      tur: dosyalar.tur,
      silinme: dosyalar.silinme_zamani,
    })
    .from(dosyalar);
  const adlar = new Map<string, (typeof satirlar)[number]>();
  for (const satir of satirlar) {
    const u = uzanti(satir.tur);
    if (u) adlar.set(`${satir.kimlik}.${u}`, satir);
  }

  // Kalıcı silme: süresi dolan silinmiş işaretli dosyanın kendisi.
  const sinir = simdi.getTime() - ayar.kaliciSilmeGun * gunMs;
  let kaliciSilinen = 0;
  for (const [ad, satir] of adlar) {
    if (satir.silinme === null || satir.silinme.getTime() >= sinir) continue;
    try {
      await unlink(join(klasor, ad));
      kaliciSilinen += 1;
    } catch (hata) {
      if ((hata as NodeJS.ErrnoException).code !== "ENOENT") throw hata;
    }
  }

  // Diskteki dosyalar: kaydı olmayanlar ve kaydı olup diskte olmayanlar.
  const diskte = new Set(await readdir(klasor));
  const yeniSinir = simdi.getTime() - ayar.yeniDosyaDakika * 60_000;
  const kayitsiz: string[] = [];
  for (const ad of [...diskte].sort()) {
    if (adlar.has(ad)) continue;
    const bilgi = await stat(join(klasor, ad)).catch(() => undefined);
    if (bilgi?.isFile() && bilgi.mtimeMs < yeniSinir) kayitsiz.push(ad);
  }
  const eksik = [...adlar]
    .filter(([ad, satir]) => satir.silinme === null && !diskte.has(ad))
    .map(([ad]) => ad)
    .sort();

  // Kullanılmayan silinmemiş dosyalar (yalnız sayılır). Boyutlar ayrı sayılmaz.
  const boyutlar = new Set(
    (await vt.select({ k: dosyaBoyutlari.dosya_kimligi }).from(dosyaBoyutlari)).map((b) => b.k),
  );
  const adaylar = satirlar
    .filter((s) => s.silinme === null && !boyutlar.has(s.kimlik) && !kullanilan.has(s.kimlik))
    .map((s) => s.kimlik);
  const json = await jsondaGecenler(vt, adaylar);
  const kullanilmayan = adaylar.filter((k) => !json.has(k)).length;

  return {
    isaretlenenBelge: isaretlenecek.length,
    kaliciSilinen,
    kayitsiz,
    eksik,
    kullanilmayan,
  };
};
