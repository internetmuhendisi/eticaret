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
import { ayarBilgileri, magazaAyarSemasi } from "../../ayar-semasi/ayarlar.ts";
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { hatayiKaydet } from "../../izleme/hata-katmani.ts";
import { type DegisikligiYapan, sistemIslemi } from "../../kayitlar/degisiklik-islemleri.ts";
import { siteninVeritabani, type Veritabani } from "../../veritabani/baglanti.ts";
import { degisikligiKaydet } from "../degisiklik-kaydi/servis.ts";
import { magazaAyarlari } from "./model.ts";

// Başlangıç yazımını yapan, değişiklik kaydında "kim" olarak görünür.
export const baslangicYazari = sistemIslemi("baslangic-ayarlari");

// Değer JSON olarak saklanır; boş (undefined) ayar null olur. Nesne ayarının içindeki boş alan
// düşer: veritabanı onu zaten saklamaz, değişiklik kaydı da boş değeri kabul etmez.
export const saklanan = (deger: unknown): unknown =>
  deger === undefined ? null : JSON.parse(JSON.stringify(deger));

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
  // Değişiklik kaydına giden değer: kayıtta gizli ayarın yalnız adı yazılır (ayarlar.ts, kart 0071).
  const kayitDegeri = (anahtar: string, deger: unknown): Record<string, unknown> => {
    const alan = Object.hasOwn(sema.shape, anahtar) ? sema.shape[anahtar] : undefined;
    const gizli = alan !== undefined && ayarBilgileri.get(alan)?.kayittaGizli === true;
    return gizli ? { ayar: anahtar } : { ayar: anahtar, deger };
  };

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
          yeni: kayitDegeri(anahtar, saklanan(ilkDegerler[anahtar])),
        });
      }
    });
    return true;
  };

  // Tek bir ayarı okur: öteki ayarlardan biri bozuk olsa da bu ayar okunur. Bütün şemanın kuralı
  // burada denetlenmez; o, bütün ayarları okuyan oku() ve değiştirme işindedir.
  const tekOku = async <K extends keyof z.output<S> & string>(
    vt: Veritabani,
    anahtar: K,
  ): Promise<z.output<S>[K]> => {
    let [satir] = await satirlariOku(vt, [anahtar]);
    if (satir === undefined) {
      await eksikleriYaz(vt, await satirlariOku(vt));
      [satir] = await satirlariOku(vt, [anahtar]);
    }
    if (satir === undefined) throw new Error(`Mağaza ayarı veritabanında yok: ${anahtar}.`);
    const sonuc = sema.shape[anahtar]?.safeParse(satir.deger ?? undefined);
    if (!sonuc?.success) {
      throw new Error(
        `Mağaza ayarının veritabanındaki değeri şemaya uymuyor: ${anahtar}. Değer bir veri değişikliğiyle düzeltilmeli.`,
      );
    }
    return sonuc.data as z.output<S>[K];
  };

  const oku = async (vt: Veritabani): Promise<z.output<S>> => {
    const satirlar = await satirlariOku(vt);
    if (await eksikleriYaz(vt, satirlar)) return coz(await satirlariOku(vt));
    return coz(satirlar);
  };

  // Verilen ayarları değiştirir; değeri aynı kalan ayar kayda girmez. Bilinmeyen ayar, şemaya
  // uymayan değer ya da bütün şemaya konan bir kurala aykırı sonuç hiçbir şeyi değiştirmez.
  // kendiIslevi: kendi işleviyle değişen ayarları (ayarlar.ts, kendiIsleviyle) yalnız o işlev verir.
  // Yeni değerler, bugünkü ayarlardan kurulacaksa işlev olarak verilir (kart 0224): işlev kilitli satırlardan okunan
  // ayarlarla kilidin içinde çağrılır, aynı anda gelen değişikliğin sonucunu görür. Kilidin dışında okuyup bütün
  // değeri yazmak arada yazılanı geri alırdı. İşlevin attığı hata işlemi geri alır.
  const degistir = async (
    vt: Veritabani,
    kim: DegisikligiYapan,
    yeniler: Partial<z.input<S>> | ((bugunku: z.output<S>) => Partial<z.input<S>>),
    { kendiIslevi = false }: { kendiIslevi?: boolean } = {},
  ): Promise<z.output<S>> => {
    const degerleriHazirla = (verilen: Partial<z.input<S>>) => {
      const degerler = new Map<string, unknown>();
      for (const [anahtar, ham] of Object.entries(verilen)) {
        const alan = Object.hasOwn(sema.shape, anahtar) ? sema.shape[anahtar] : undefined;
        if (alan === undefined) throw new Error(`Bilinmeyen mağaza ayarı: ${anahtar}.`);
        if (!kendiIslevi && ayarBilgileri.get(alan)?.kendiIsleviyle === true) {
          throw new Error(`Bu mağaza ayarı yalnız kendi işleviyle değişir: ${anahtar}.`);
        }
        const sonuc = alan.safeParse(ham);
        if (!sonuc.success) throw new Error(`Mağaza ayarının değeri geçersiz: ${anahtar}.`);
        degerler.set(anahtar, saklanan(sonuc.data));
      }
      return degerler;
    };
    const verilenDegerler = typeof yeniler === "function" ? undefined : degerleriHazirla(yeniler);
    if (verilenDegerler?.size === 0) return oku(vt);
    await eksikleriYaz(vt, await satirlariOku(vt));
    await vt.transaction(async (islem) => {
      // Bütün ayar satırları kilitlenir: aynı anda gelen iki değişiklik sırayla çalışır, eski değer
      // kayıtta doğru görünür ve bütün şemanın kuralı öteki değişikliğin sonucuyla denetlenir.
      const butun = await islem
        .select({
          kimlik: magazaAyarlari.kimlik,
          anahtar: magazaAyarlari.anahtar,
          deger: magazaAyarlari.deger,
        })
        .from(magazaAyarlari)
        .orderBy(magazaAyarlari.anahtar)
        .for("update");
      const yeniDegerler =
        verilenDegerler ??
        (typeof yeniler === "function" ? degerleriHazirla(yeniler(coz(butun))) : new Map());
      // Sonuç yazılmadan önce bütün şemadan geçer; geçmezse işlem geri alınır.
      try {
        coz(
          butun.map((satir) =>
            yeniDegerler.has(satir.anahtar)
              ? { ...satir, deger: yeniDegerler.get(satir.anahtar) }
              : satir,
          ),
        );
      } catch {
        throw new Error(
          `Mağaza ayarlarının yeni hâli şemaya uymuyor: ${[...yeniDegerler.keys()].join(", ")}.`,
        );
      }
      const satirlar = butun.filter((satir) => yeniDegerler.has(satir.anahtar));
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
          eski: kayitDegeri(satir.anahtar, satir.deger),
          yeni: kayitDegeri(satir.anahtar, yeni),
        });
      }
    });
    return oku(vt);
  };

  return { oku, tekOku, degistir };
};

// Çalışan sitenin servisi. Başlangıç değerleri site klasöründen gelir, yalnız eksik ayar varsa okunur.
const calisanSiteninServisi = magazaAyarlariServisi(
  magazaAyarSemasi,
  () => calisanSite().baslangic,
);

export const magazaAyarlariniOku = (vt: Veritabani = siteninVeritabani()) =>
  calisanSiteninServisi.oku(vt);

// Verilen sitenin servisi: arka plan işi ve testler siteyi kendisi verir.
export const siteninServisi = (site: Site) =>
  magazaAyarlariServisi(magazaAyarSemasi, () => site.baslangic);

export const siteninMagazaAyarlari = (vt: Veritabani, site: Site) => siteninServisi(site).oku(vt);

// Müşterinin ve mağaza sahibinin gördüğü mağaza adı (kart 0071, karar 0057). Yalnız kendi ayarını
// okur. Okunamazsa (veritabanı yok, değer bozuk) kimlikteki ad gösterilir ve hata kaydedilir: ad
// görünüştür, vitrin, panel girişi ve şifre sıfırlama e-postası onun yüzünden düşmemeli. Kimlikteki
// ad ayrıca yalnız ayar boşsa kullanılır; başlangıç değeri onu zaten doldurur.
export const magazaninAdi = async (
  vt?: Veritabani,
  site: Site = calisanSite(),
): Promise<string> => {
  try {
    const ad = await siteninServisi(site).tekOku(vt ?? siteninVeritabani(), "magazaAdi");
    return ad ?? site.kimlik.gorunenAd;
  } catch (hata) {
    hatayiKaydet(hata, { kaynak: "magaza-adi" });
    return site.kimlik.gorunenAd;
  }
};

export const magazaAyarlariniDegistir = (
  kim: DegisikligiYapan,
  yeniler: Partial<z.input<typeof magazaAyarSemasi>>,
  vt: Veritabani = siteninVeritabani(),
) => calisanSiteninServisi.degistir(vt, kim, yeniler);
