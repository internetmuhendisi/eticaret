// Fiyatı okuyan ve değiştiren tek yol (kart 0080, karar 0066).
//
// - Fiyat satılabilir birime bağlıdır (karar 0062). Silinmiş ürünün ya da birimin fiyatı değişmez,
//   eski fiyatı okunabilir.
// - Girdi fiyatın tam hâlidir (semalar.ts). İndirim zamanları sitenin saat diliminde yerel olarak gelir,
//   `yerelZamandan` ile ana çevrilir (ürünün yayın zamanıyla aynı yol).
// - Para birimi yazıldığı andaki site ayarıdır, fiyatla birlikte saklanır.
// - Her değişiklik aynı veritabanı işleminde üç yere yazılır: bugünkü fiyat (birim_fiyatlari), fiyat
//   geçmişi (fiyat_gecmisi, sonradan değiştirilemez) ve değişiklik kaydı (kim değiştirdi). Biri düşerse
//   hiçbiri yazılmaz. Aynı kalan fiyat hiçbir yere yazılmaz.
// - Yarış: yazmalar ürün kilidini alır (cekirdek/moduller/urun/kilit.ts). Aynı anda gelen iki değişiklik
//   sırayla yazılır, geçmiş sırası bozulmaz; aynı anda silinen ürünün birimine fiyat yazılmaz.
//
// İzin kapıda denetlenir (izinler.ts); servis yalnız kimin yaptığını kayda yazar.
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { z } from "zod";
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { hatayiKaydet } from "../../izleme/hata-katmani.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri.ts";
import { yerelZamandan } from "../../metinler/bicimleyici.ts";
import { siteninVeritabani, type Veritabani } from "../../veritabani/baglanti.ts";
import { kimlikMi } from "../../veritabani/turler.ts";
import { degisikligiKaydet } from "../degisiklik-kaydi/servis.ts";
import { urunKilidiAl } from "../urun/kilit.ts";
import { urunBirimleri, urunler } from "../urun/model.ts";
import { type Fiyat, type GecerliFiyat, gecerliFiyat } from "./gecerli.ts";
import { birimFiyatlari, fiyatGecmisi } from "./model.ts";
import { type FiyatGirdisi, type FiyatHatasi, fiyatGirdisi, fiyatHatalari } from "./semalar.ts";

export type FiyatAyarlari = { saatDilimi: string; paraBirimi: string };

export type FiyatGecmisiSatiri = Omit<Fiyat, "birim"> & { kimlik: string; zaman: Date };

// Süreçte bir kez kaydedilen para birimi uyuşmazlıkları ("TRY>EUR").
const bildirilenUyusmazliklar = new Set<string>();

// Bir sayfada okunan geçmiş satırının üst sınırı (.claude/rules/veritabani.md).
export const fiyatGecmisiSayfasi = 100;

type Sorun = { alan: string; kod: string };
const dogrulamaHatasi = (sorunlar: Sorun[]) => new BilinenHata("dogrulama", sorunlar);
const sorun = (alan: string, kod: FiyatHatasi): Sorun => ({ alan, kod });

const bilinenKodlar = new Set<string>(fiyatHatalari);
const girdiyiDogrula = <T>(sonuc: z.ZodSafeParseResult<T>): T => {
  if (sonuc.success) return sonuc.data;
  throw dogrulamaHatasi(
    sonuc.error.issues.map((s) => ({
      alan: s.path.join("."),
      kod: bilinenKodlar.has(s.message) ? s.message : s.code,
    })),
  );
};

const fiyatAlanlari = {
  birim: birimFiyatlari.birim_kimligi,
  satisFiyati: birimFiyatlari.satis_fiyati,
  indirimliFiyat: birimFiyatlari.indirimli_fiyat,
  indirimBaslangici: birimFiyatlari.indirim_baslangici,
  indirimBitisi: birimFiyatlari.indirim_bitisi,
  paraBirimi: birimFiyatlari.para_birimi,
};

const zamanDegeri = (an: Date | null) => (an === null ? null : an.toISOString());

// Değişiklik kaydına giden değer: boş alanlar yazılmaz, zamanlar ISO metnidir.
const kayitDegeri = (fiyat: Omit<Fiyat, "birim">): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries({
      satisFiyati: fiyat.satisFiyati,
      indirimliFiyat: fiyat.indirimliFiyat,
      indirimBaslangici: zamanDegeri(fiyat.indirimBaslangici),
      indirimBitisi: zamanDegeri(fiyat.indirimBitisi),
      paraBirimi: fiyat.paraBirimi,
    }).filter(([, deger]) => deger !== null),
  );

const ayniMi = (a: Omit<Fiyat, "birim">, b: Omit<Fiyat, "birim">) =>
  JSON.stringify(kayitDegeri(a)) === JSON.stringify(kayitDegeri(b));

export const fiyatServisi = (ayarlar: () => FiyatAyarlari) => {
  // Yerel zaman → an. Saat dilimi o anki ayardan okunur.
  const ana = (alan: string, yerel: string | null): Date | null => {
    if (yerel === null) return null;
    const an = yerelZamandan(yerel, ayarlar().saatDilimi);
    if (an === undefined) throw dogrulamaHatasi([sorun(alan, "indirim-zamani-gecersiz")]);
    return an;
  };

  // Alanlar arası kurallar: indirimli fiyat satış fiyatından küçük, zaman yalnız indirimle, bitiş
  // başlangıçtan sonra. Bütün sorunlar birlikte döner.
  const kurallariDenetle = (fiyat: Omit<Fiyat, "birim">) => {
    const sorunlar: Sorun[] = [];
    const { indirimliFiyat, indirimBaslangici, indirimBitisi } = fiyat;
    if (indirimliFiyat !== null && indirimliFiyat >= fiyat.satisFiyati) {
      sorunlar.push(sorun("indirimliFiyat", "indirim-buyuk"));
    }
    if (indirimliFiyat === null) {
      if (indirimBaslangici !== null) {
        sorunlar.push(sorun("indirimBaslangici", "indirim-zamani-indirimsiz"));
      }
      if (indirimBitisi !== null)
        sorunlar.push(sorun("indirimBitisi", "indirim-zamani-indirimsiz"));
    }
    if (
      indirimBaslangici !== null &&
      indirimBitisi !== null &&
      indirimBitisi.getTime() <= indirimBaslangici.getTime()
    ) {
      sorunlar.push(sorun("indirimBitisi", "indirim-sirasi"));
    }
    if (sorunlar.length > 0) throw dogrulamaHatasi(sorunlar);
  };

  // Birimin fiyatını yazar. Birim yoksa, birim ya da ürünü silinmişse bulunamadı.
  const fiyatYaz = async (
    vt: Veritabani,
    kim: DegisikligiYapan,
    birim: string,
    ham: FiyatGirdisi,
  ): Promise<void> => {
    const girdi = girdiyiDogrula(fiyatGirdisi.safeParse(ham));
    const yeni = {
      satisFiyati: girdi.satisFiyati,
      indirimliFiyat: girdi.indirimliFiyat,
      indirimBaslangici: ana("indirimBaslangici", girdi.indirimBaslangici),
      indirimBitisi: ana("indirimBitisi", girdi.indirimBitisi),
      paraBirimi: ayarlar().paraBirimi,
    };
    kurallariDenetle(yeni);
    if (!kimlikMi(birim)) throw new BilinenHata("bulunamadi");
    await vt.transaction(async (islem) => {
      await urunKilidiAl(islem);
      const [bulunan] = await islem
        .select({ kimlik: urunBirimleri.kimlik })
        .from(urunBirimleri)
        .innerJoin(urunler, eq(urunler.kimlik, urunBirimleri.urun_kimligi))
        .where(
          and(
            eq(urunBirimleri.kimlik, birim),
            isNull(urunBirimleri.silinme_zamani),
            isNull(urunler.silinme_zamani),
          ),
        );
      if (bulunan === undefined) throw new BilinenHata("bulunamadi");
      const [eski] = await islem
        .select(fiyatAlanlari)
        .from(birimFiyatlari)
        .where(eq(birimFiyatlari.birim_kimligi, birim));
      if (eski !== undefined && ayniMi(eski, yeni)) return;
      const satir = {
        satis_fiyati: yeni.satisFiyati,
        indirimli_fiyat: yeni.indirimliFiyat,
        indirim_baslangici: yeni.indirimBaslangici,
        indirim_bitisi: yeni.indirimBitisi,
        para_birimi: yeni.paraBirimi,
      };
      await islem
        .insert(birimFiyatlari)
        .values({ birim_kimligi: birim, ...satir })
        .onConflictDoUpdate({
          target: birimFiyatlari.birim_kimligi,
          set: { ...satir, guncellenme_zamani: sql`now()` },
        });
      // Geçmişin zamanı kilit alındıktan sonraki saattir, işlemin başladığı an değil: aynı anda
      // başlayan iki değişiklikte geçmişin sırası yazılma sırasıyla aynı olsun.
      await islem
        .insert(fiyatGecmisi)
        .values({ birim_kimligi: birim, ...satir, zaman: sql`clock_timestamp()` });
      await degisikligiKaydet(islem, {
        kim,
        islem: "fiyat.degisti",
        kayit: { tur: "fiyat", kimlik: birim },
        eski: eski === undefined ? null : kayitDegeri(eski),
        yeni: kayitDegeri(yeni),
      });
    });
  };

  // Birimlerin fiyatları tek sorguyla; fiyatı olmayan birim haritada yoktur. Silinmiş birimin fiyatı
  // da okunur (eski kayıtlar ona bağlıdır). Birimin satılıp satılamayacağına (silinmiş, görünmeyen
  // ürün) burada bakılmaz: sepet ve vitrin birimi önce kendi koşuluyla süzer (karar 0066).
  const fiyatlariOku = async (vt: Veritabani, birimler: string[]): Promise<Map<string, Fiyat>> => {
    const gecerli = birimler.filter(kimlikMi);
    if (gecerli.length === 0) return new Map();
    const satirlar = await vt
      .select(fiyatAlanlari)
      .from(birimFiyatlari)
      .where(inArray(birimFiyatlari.birim_kimligi, gecerli));
    return new Map(satirlar.map((satir) => [satir.birim, satir]));
  };

  const fiyatOku = async (vt: Veritabani, birim: string): Promise<Fiyat | undefined> =>
    (await fiyatlariOku(vt, [birim])).get(birim);

  // Birimlerin verilen andaki geçerli fiyatları, tek sorguyla. Fiyatı olmayan birim haritada yoktur:
  // satılamaz. Para birimi uyuşmayan fiyat da yoktur ve hata kaydedilir: ayar değişmiş, fiyatlar
  // yeniden girilmemiştir. Hata her para birimi çifti için süreç başına bir kez kaydedilir: yoksa her
  // vitrin açılışı hata izleme aracını birim sayısı kadar kayıtla doldururdu.
  const gecerliFiyatlar = async (
    vt: Veritabani,
    birimler: string[],
    an: Date = new Date(),
  ): Promise<Map<string, GecerliFiyat>> => {
    const { paraBirimi } = ayarlar();
    const sonuc = new Map<string, GecerliFiyat>();
    for (const [birim, fiyat] of await fiyatlariOku(vt, birimler)) {
      const gecerli = gecerliFiyat(fiyat, an, paraBirimi);
      if (gecerli !== undefined) {
        sonuc.set(birim, gecerli);
        continue;
      }
      const cift = `${fiyat.paraBirimi}>${paraBirimi}`;
      if (bildirilenUyusmazliklar.has(cift)) continue;
      bildirilenUyusmazliklar.add(cift);
      hatayiKaydet(new Error("Fiyatın para birimi sitenin para biriminden farklı."), {
        kaynak: "fiyat",
        birim,
        fiyatinParaBirimi: fiyat.paraBirimi,
        siteninParaBirimi: paraBirimi,
      });
    }
    return sonuc;
  };

  // Birimin fiyat geçmişi, en yeni önce, en çok bir sayfa. `sonra` bir önceki sayfanın son satırının
  // kimliğidir: sonraki sayfa o satırdan sonra gelenlerdir. Karşılaştırma veritabanında, satırın kendi
  // zamanı ve kimliğiyle yapılır; uygulamaya milisaniyeye kesilerek gelen zaman kullanılsaydı aynı
  // milisaniyedeki satır sayfalar arasında kaybolabilirdi (kart 0080 kontrolü).
  const fiyatGecmisiniOku = async (
    vt: Veritabani,
    birim: string,
    secenekler: { sonra?: string; sinir?: number } = {},
  ): Promise<FiyatGecmisiSatiri[]> => {
    const { sonra } = secenekler;
    if (!kimlikMi(birim) || (sonra !== undefined && !kimlikMi(sonra))) return [];
    const sinir = Math.min(
      Math.max(secenekler.sinir ?? fiyatGecmisiSayfasi, 1),
      fiyatGecmisiSayfasi,
    );
    return vt
      .select({
        kimlik: fiyatGecmisi.kimlik,
        zaman: fiyatGecmisi.zaman,
        satisFiyati: fiyatGecmisi.satis_fiyati,
        indirimliFiyat: fiyatGecmisi.indirimli_fiyat,
        indirimBaslangici: fiyatGecmisi.indirim_baslangici,
        indirimBitisi: fiyatGecmisi.indirim_bitisi,
        paraBirimi: fiyatGecmisi.para_birimi,
      })
      .from(fiyatGecmisi)
      .where(
        and(
          eq(fiyatGecmisi.birim_kimligi, birim),
          sonra === undefined
            ? undefined
            : sql`(${fiyatGecmisi.zaman}, ${fiyatGecmisi.kimlik}) < (select ${fiyatGecmisi.zaman}, ${fiyatGecmisi.kimlik} from ${fiyatGecmisi} where ${fiyatGecmisi.kimlik} = ${sonra})`,
        ),
      )
      .orderBy(desc(fiyatGecmisi.zaman), desc(fiyatGecmisi.kimlik))
      .limit(sinir);
  };

  return { fiyatYaz, fiyatOku, fiyatlariOku, gecerliFiyatlar, fiyatGecmisiniOku };
};

export const siteninFiyatServisi = (site: Site) =>
  fiyatServisi(() => ({
    saatDilimi: site.ayarlar.saatDilimi,
    paraBirimi: site.ayarlar.paraBirimi,
  }));

const calisanSiteninServisi = fiyatServisi(() => {
  const { saatDilimi, paraBirimi } = calisanSite().ayarlar;
  return { saatDilimi, paraBirimi };
});
export const calisanSiteninFiyatServisi = () => calisanSiteninServisi;
export const birimGecerliFiyatlari = (
  birimler: string[],
  an?: Date,
  vt: Veritabani = siteninVeritabani(),
) => calisanSiteninServisi.gecerliFiyatlar(vt, birimler, an);
