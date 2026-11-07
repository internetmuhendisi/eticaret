// Mağaza sahibinin ayarlarını okuyan ve değiştiren tek yol (kart 0069, kararlar 0010 ve 0055).
//
// - Okuma bütün ayarları tek sorguyla alır. Veritabanında satırı olmayan ayar varsa önce başlangıç
//   değeriyle (site klasöründeki baslangic/ayarlar.json, yoksa şemanın varsayılanı) yazılır. Yazılmış
//   bir değer başlangıç dosyası sonradan değişse de değişmez: dosya ile veritabanı yarışmaz.
// - Aynı anda açılan iki süreç aynı ayarı iki kez yazamaz: tekil indeks ikinciyi atlatır, değişiklik
//   kaydına yalnız gerçekten yazan düşer.
// - Veritabanındaki değer şemaya uymuyorsa okuma hata verir, sessizce varsayılana dönmez: yanlış
//   ayarla satış yapılmasın. Hata değeri yazmaz (kişisel bilgi taşıyabilir).
// - Her yazım değişiklik kaydına aynı veritabanı işleminde girer (karar 0045).
//
// İzin kapıda denetlenir (izinler.ts); servis yalnız kimin yaptığını kayda yazar.
import { isDeepStrictEqual } from "node:util";
import { inArray, sql } from "drizzle-orm";
import type { z } from "zod";
import { magazaAyarSemasi } from "../../ayar-semasi/ayarlar.ts";
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { type DegisikligiYapan, sistemIslemi } from "../../kayitlar/degisiklik-islemleri.ts";
import { siteninVeritabani, type Veritabani } from "../../veritabani/baglanti.ts";
import { degisikligiKaydet } from "../degisiklik-kaydi/servis.ts";
import { magazaAyarlari } from "./model.ts";

// Başlangıç yazımını yapan, değişiklik kaydında "kim" olarak görünür.
export const baslangicYazari = sistemIslemi("baslangic-ayarlari");

// Değer JSON olarak saklanır; boş (undefined) ayar null olur.
const saklanan = (deger: unknown): unknown => (deger === undefined ? null : deger);

type Satir = { kimlik: string; anahtar: string; deger: unknown };

const satirlariOku = async (vt: Veritabani, anahtarlar?: string[]): Promise<Satir[]> =>
  vt
    .select({
      kimlik: magazaAyarlari.kimlik,
      anahtar: magazaAyarlari.anahtar,
      deger: magazaAyarlari.deger,
    })
    .from(magazaAyarlari)
    .where(anahtarlar === undefined ? undefined : inArray(magazaAyarlari.anahtar, anahtarlar));

export const magazaAyarlariServisi = <S extends z.ZodObject>(
  sema: S,
  baslangic: () => z.output<S>,
) => {
  const anahtarlar = Object.keys(sema.shape);

  // Veritabanındaki satırlardan ayarlar. Her ayar kendi şemasından geçer.
  const coz = (satirlar: Satir[]): z.output<S> => {
    const bulunan = new Map(satirlar.map((satir) => [satir.anahtar, satir.deger]));
    const deger: Record<string, unknown> = {};
    for (const anahtar of anahtarlar) {
      if (!bulunan.has(anahtar)) {
        throw new Error(`Mağaza ayarı veritabanında yok: ${anahtar}.`);
      }
      const sonuc = sema.shape[anahtar]?.safeParse(bulunan.get(anahtar) ?? undefined);
      if (!sonuc?.success) {
        throw new Error(
          `Mağaza ayarının veritabanındaki değeri şemaya uymuyor: ${anahtar}. Değer bir veri değişikliğiyle düzeltilmeli.`,
        );
      }
      deger[anahtar] = sonuc.data;
    }
    return sema.parse(deger);
  };

  // Satırı olmayan ayarları başlangıç değeriyle yazar. Yarışı kaybeden süreç hiçbir şey yazmaz.
  const eksikleriYaz = async (vt: Veritabani, satirlar: Satir[]): Promise<boolean> => {
    const olanlar = new Set(satirlar.map((satir) => satir.anahtar));
    const eksikler = anahtarlar.filter((anahtar) => !olanlar.has(anahtar));
    if (eksikler.length === 0) return false;
    const ilkDegerler = baslangic() as Record<string, unknown>;
    await vt.transaction(async (islem) => {
      const yazilanlar = await islem
        .insert(magazaAyarlari)
        .values(eksikler.map((anahtar) => ({ anahtar, deger: saklanan(ilkDegerler[anahtar]) })))
        .onConflictDoNothing({ target: magazaAyarlari.anahtar })
        .returning({ kimlik: magazaAyarlari.kimlik, anahtar: magazaAyarlari.anahtar });
      for (const { kimlik, anahtar } of yazilanlar) {
        await degisikligiKaydet(islem, {
          kim: baslangicYazari,
          islem: "magaza-ayari.baslangic",
          kayit: { tur: "magaza-ayari", kimlik },
          eski: null,
          yeni: { ayar: anahtar, deger: saklanan(ilkDegerler[anahtar]) },
        });
      }
    });
    return true;
  };

  const oku = async (vt: Veritabani): Promise<z.output<S>> => {
    const satirlar = await satirlariOku(vt);
    if (await eksikleriYaz(vt, satirlar)) return coz(await satirlariOku(vt));
    return coz(satirlar);
  };

  // Verilen ayarları değiştirir; değeri aynı kalan ayar kayda girmez. Bilinmeyen ayar ya da şemaya
  // uymayan değer hiçbir şeyi değiştirmez.
  const degistir = async (
    vt: Veritabani,
    kim: DegisikligiYapan,
    yeniler: Partial<z.input<S>>,
  ): Promise<z.output<S>> => {
    const yeniDegerler = new Map<string, unknown>();
    for (const [anahtar, ham] of Object.entries(yeniler)) {
      const alan = sema.shape[anahtar];
      if (alan === undefined) throw new Error(`Bilinmeyen mağaza ayarı: ${anahtar}.`);
      const sonuc = alan.safeParse(ham);
      if (!sonuc.success) throw new Error(`Mağaza ayarının değeri geçersiz: ${anahtar}.`);
      yeniDegerler.set(anahtar, saklanan(sonuc.data));
    }
    if (yeniDegerler.size === 0) return oku(vt);
    await eksikleriYaz(vt, await satirlariOku(vt));
    await vt.transaction(async (islem) => {
      // Aynı ayarı aynı anda değiştiren iki istek sırayla çalışır: eski değer kayıtta doğru görünür.
      const satirlar = await islem
        .select({
          kimlik: magazaAyarlari.kimlik,
          anahtar: magazaAyarlari.anahtar,
          deger: magazaAyarlari.deger,
        })
        .from(magazaAyarlari)
        .where(inArray(magazaAyarlari.anahtar, [...yeniDegerler.keys()]))
        .orderBy(magazaAyarlari.anahtar)
        .for("update");
      for (const satir of satirlar) {
        const yeni = yeniDegerler.get(satir.anahtar);
        if (isDeepStrictEqual(satir.deger, yeni)) continue;
        await islem
          .update(magazaAyarlari)
          .set({ deger: yeni, guncellenme_zamani: sql`now()` })
          .where(inArray(magazaAyarlari.kimlik, [satir.kimlik]));
        await degisikligiKaydet(islem, {
          kim,
          islem: "magaza-ayari.degisti",
          kayit: { tur: "magaza-ayari", kimlik: satir.kimlik },
          eski: { ayar: satir.anahtar, deger: satir.deger },
          yeni: { ayar: satir.anahtar, deger: yeni },
        });
      }
    });
    return oku(vt);
  };

  return { oku, degistir };
};

// Çalışan sitenin servisi. Başlangıç değerleri site klasöründen gelir, yalnız eksik ayar varsa okunur.
const calisanSiteninServisi = magazaAyarlariServisi(
  magazaAyarSemasi,
  () => calisanSite().baslangic,
);

export const magazaAyarlariniOku = (vt: Veritabani = siteninVeritabani()) =>
  calisanSiteninServisi.oku(vt);

export const magazaAyarlariniDegistir = (
  kim: DegisikligiYapan,
  yeniler: Partial<z.input<typeof magazaAyarSemasi>>,
  vt: Veritabani = siteninVeritabani(),
) => calisanSiteninServisi.degistir(vt, kim, yeniler);
