// Kuponun servisi (kart 0312, karar 0187). Kupon yalnız buradan okunur, kullanımı yalnız buradan ayrılır, siparişe
// bağlanır ve serbest bırakılır. Hesap hesap.ts'tedir; panelin kupon ekranları kart 0313'tedir.
//
// Kurallar:
// - Müşterinin yazdığı kod kırpılır; harf duyarsızken (altyapı sahibinin kuponKoduHarfDuyarli ayarı kapalı) ad
//   anahtarıyla, duyarlıyken aynen aranır. Silinmiş kupon bulunmaz.
// - Kapsam: "urunler" kuponu seçili ürünlerde, "kategoriler" kuponu seçili kategorilerin ve silinmemiş alt
//   kategorilerinin ürünlerinde geçer. Silinmiş kategori sayılmaz.
// - Sayılan kullanım: serbest bırakılmamış ve siparişe bağlı ya da süresi dolmamış ayırma. Kişi başı kullanım aynı
//   hesabın ya da aynı e-postanın (küçük harfle) kullanımlarıdır. Oturumun kendi ayırması sayılmaz.
// - Ayırma (ödeme oturumu açılırken) ve bağlama (sipariş kurulurken) kuponun satırını kilitler: aynı anda gelen
//   iki ödeme sınırı aşamaz. Bağlamada oturumun ayırması yoksa ya da süresi dolduysa sınırlar yeniden sayılır.
// - Kullanılmış kuponun kodu, türü, değeri, kapsamı ve "indirimde geçmez"i değişmez (karar 0185, veritabanında
//   kupon_degismezlik tetikleyicisi).
import { and, eq, gt, inArray, isNotNull, isNull, ne, or, type SQL, sql } from "drizzle-orm";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri.ts";
import {
  type KuponHatasi,
  type KuponKapsami,
  type KuponTuru,
  kuponKoduKalibi,
  kuponSinirlari,
} from "../../kayitlar/kampanya.ts";
import { adAnahtariSql } from "../../metinler/ad-anahtari.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { kimligiDuzelt } from "../../veritabani/kimlik.ts";
import { degisikligiKaydet } from "../degisiklik-kaydi/servis.ts";
import { kategoriler, urunKategorileri } from "../kategori/model.ts";
import { urunler } from "../urun/model.ts";
import type { HesapKuponu } from "./hesap.ts";
import { type Kupon, kuponKapsami, kuponKullanimlari, kuponlar } from "./model.ts";

export type BulunanKupon = HesapKuponu & {
  kimlik: string;
  kod: string;
  kapsam: KuponKapsami;
};

// Kullanımı sayan kişi: hesabı ve (biliniyorsa) e-postası.
export type KuponKisisi = { musteri: string | null; eposta: string | null };

const hesapKuponu = (satir: Kupon): BulunanKupon => ({
  kimlik: satir.kimlik,
  kod: satir.kod,
  tur: satir.tur as KuponTuru,
  deger: satir.deger,
  kapsam: satir.kapsam as KuponKapsami,
  enAzTutar: satir.en_az_tutar,
  baslangic: satir.baslangic_zamani,
  bitis: satir.bitis_zamani,
  toplamSinir: satir.toplam_sinir,
  kisiBasiSinir: satir.kisi_basi_sinir,
  indirimdeGecmez: satir.indirimde_gecmez,
  acik: satir.acik,
});

// Müşterinin yazdığı kodun biçimi: uzunluk ve kalıp dışındaki kod hiç aranmaz.
export const kodBiciminde = (kod: string): string | undefined => {
  const temiz = kod.trim().normalize("NFC");
  return temiz.length >= kuponSinirlari.kodEnAz &&
    temiz.length <= kuponSinirlari.kodEnCok &&
    kuponKoduKalibi.test(temiz)
    ? temiz
    : undefined;
};

const sayilanKullanim = (): SQL =>
  and(
    isNull(kuponKullanimlari.serbest_zamani),
    or(
      isNotNull(kuponKullanimlari.siparis_kimligi),
      gt(kuponKullanimlari.bitis_zamani, sql`now()`),
    ),
  ) as SQL;

const epostaAnahtari = (eposta: string | null) => (eposta === null ? null : eposta.toLowerCase());

// Ödeme başarısız ya da müşteri yeniden onayladı: oturumun siparişe bağlanmamış ayırması gider. Yalnız oturumun
// ayırmalarını birlikte bırakan işlevden çağrılır (cekirdek/moduller/odeme/ayirma.ts).
export const kuponAyirmasiniBirak = async (
  islem: VeritabaniIslemi,
  oturum: string,
): Promise<void> => {
  await islem
    .delete(kuponKullanimlari)
    .where(
      and(eq(kuponKullanimlari.oturum_kimligi, oturum), isNull(kuponKullanimlari.siparis_kimligi)),
    );
};

// İptal ve tam iade (karar 0185): siparişin kullanımı geri verilir (sayılmaz olur). Kısmi iade çağırmaz. Siteye bağlı
// değildir: iptalin tek akışı (siparis/iade.ts) siteyi taşımadan çağırır.
export const kuponKullaniminiSerbestBirak = async (
  islem: VeritabaniIslemi,
  siparis: string,
): Promise<void> => {
  await islem
    .update(kuponKullanimlari)
    .set({ serbest_zamani: sql`now()` })
    .where(
      and(eq(kuponKullanimlari.siparis_kimligi, siparis), isNull(kuponKullanimlari.serbest_zamani)),
    );
};

// Kuponun bütün alanları (servisin ekleme ve değiştirme girdisi; zamanlar an olarak, tutarlar kuruş).
export type KuponGirdisi = {
  kod: string;
  ad: string | null;
  tur: KuponTuru;
  deger: number;
  kapsam: KuponKapsami;
  kapsamKayitlari: string[];
  enAzTutar: number | null;
  baslangic: Date | null;
  bitis: Date | null;
  toplamSinir: number | null;
  kisiBasiSinir: number | null;
  indirimdeGecmez: boolean;
  acik: boolean;
};
export type KuponEklemeGirdisi = Pick<KuponGirdisi, "kod" | "tur" | "deger" | "kapsam"> &
  Partial<Omit<KuponGirdisi, "kod" | "tur" | "deger" | "kapsam">>;

const kuponAlanlari = [
  "kod",
  "ad",
  "tur",
  "deger",
  "kapsam",
  "kapsamKayitlari",
  "enAzTutar",
  "baslangic",
  "bitis",
  "toplamSinir",
  "kisiBasiSinir",
  "indirimdeGecmez",
  "acik",
] as const satisfies readonly (keyof KuponGirdisi)[];
// Kullanılmış kuponda değişmeyen alanlar (karar 0185; veritabanında kupon_degismezlik ve kupon_kapsami_degismezlik).
export const kullanilincaKilitli: readonly (keyof KuponGirdisi)[] = [
  "kod",
  "tur",
  "deger",
  "kapsam",
  "kapsamKayitlari",
  "indirimdeGecmez",
];

const eklemeGirdisi = (girdi: KuponEklemeGirdisi): KuponGirdisi =>
  ({
    ad: null,
    enAzTutar: null,
    baslangic: null,
    bitis: null,
    toplamSinir: null,
    kisiBasiSinir: null,
    indirimdeGecmez: false,
    acik: true,
    ...Object.fromEntries(Object.entries(girdi).filter(([, deger]) => deger !== undefined)),
    kapsamKayitlari: [...new Set((girdi.kapsamKayitlari ?? []).map(kimligiDuzelt))].sort(),
  }) as KuponGirdisi;

const kuponSatiri = (girdi: KuponGirdisi) => ({
  ad: girdi.ad,
  tur: girdi.tur,
  deger: girdi.deger,
  kapsam: girdi.kapsam,
  en_az_tutar: girdi.enAzTutar,
  baslangic_zamani: girdi.baslangic,
  bitis_zamani: girdi.bitis,
  toplam_sinir: girdi.toplamSinir,
  kisi_basi_sinir: girdi.kisiBasiSinir,
  indirimde_gecmez: girdi.indirimdeGecmez,
  acik: girdi.acik,
});

const kapsamiYaz = async (islem: VeritabaniIslemi, kupon: string, girdi: KuponGirdisi) => {
  if (girdi.kapsamKayitlari.length === 0) return;
  await islem.insert(kuponKapsami).values(
    girdi.kapsamKayitlari.map((kayit) => ({
      kupon_kimligi: kupon,
      kayit_kimligi: kayit,
      ...(girdi.kapsam === "urunler" ? { urun_kimligi: kayit } : { kategori_kimligi: kayit }),
    })),
  );
};

// Kuponun kayıtlı alanları (kapsam kayıtları sıralı).
export const kuponGirdisiniOku = async (
  vt: Veritabani | VeritabaniIslemi,
  satir: Kupon,
): Promise<KuponGirdisi> => {
  const kapsam = await vt
    .select({ kayit: kuponKapsami.kayit_kimligi })
    .from(kuponKapsami)
    .where(eq(kuponKapsami.kupon_kimligi, satir.kimlik));
  return {
    kod: satir.kod,
    ad: satir.ad,
    tur: satir.tur as KuponTuru,
    deger: satir.deger,
    kapsam: satir.kapsam as KuponKapsami,
    kapsamKayitlari: kapsam.map(({ kayit }) => kayit).sort(),
    enAzTutar: satir.en_az_tutar,
    baslangic: satir.baslangic_zamani,
    bitis: satir.bitis_zamani,
    toplamSinir: satir.toplam_sinir,
    kisiBasiSinir: satir.kisi_basi_sinir,
    indirimdeGecmez: satir.indirimde_gecmez,
    acik: satir.acik,
  };
};

// Aynı kod aynı anda iki işlemde yazılınca tekil indeks (kuponlar_kod) ikinciyi durdurur: düz denetim yalnız sırayla
// gelen istekleri yakalar (bağımsız kontrolün bulgusu). İhlal "kod-var"a çevrilir.
const kodTekrariMi = (yakalanan: unknown): boolean => {
  const kaynak = (yakalanan as { cause?: unknown })?.cause ?? yakalanan;
  const hata = kaynak as { code?: string; constraint?: string } | undefined;
  return hata?.code === "23505" && hata.constraint === "kuponlar_kod";
};
const kodTekrariniCevir = (yakalanan: unknown): never => {
  if (kodTekrariMi(yakalanan)) throw new BilinenHata("cakisma", [{ alan: "kod", kod: "kod-var" }]);
  throw yakalanan;
};

const tamSayiMi = (deger: number | null, enAz: number, enCok: number) =>
  deger === null || (Number.isSafeInteger(deger) && deger >= enAz && deger <= enCok);

// Kuponun kuralları (ekleme ve değişiklik): bütün alan hataları birlikte döner (dogrulama); kod başka bir kuponda
// varsa cakisma (kod-var). Kapsama yeni eklenen ürün ve kategori silinmemiş olmalıdır (kapsamda kalan, sonradan
// silinmiş kayıt kuponu değiştirmeyi engellemez; kupon onda zaten geçmez). Biçimlenmiş kodu döner.
const kuponuDenetle = async (
  vt: VeritabaniIslemi,
  girdi: KuponGirdisi,
  onceki?: { kimlik: string; kapsamKayitlari: readonly string[] },
): Promise<string> => {
  const hatalar: { alan: string; kod: KuponHatasi }[] = [];
  const kod = kodBiciminde(girdi.kod);
  if (kod === undefined) hatalar.push({ alan: "kod", kod: "kod-gecersiz" });
  if (girdi.tur === "yuzde") {
    if (!tamSayiMi(girdi.deger, kuponSinirlari.yuzdeEnAz, kuponSinirlari.yuzdeEnCok)) {
      hatalar.push({ alan: "deger", kod: "yuzde-gecersiz" });
    }
  } else if (girdi.tur === "tutar") {
    if (!tamSayiMi(girdi.deger, 1, kuponSinirlari.tutarEnCok)) {
      hatalar.push({ alan: "deger", kod: "tutar-gecersiz" });
    }
  } else if (girdi.deger !== 0) {
    hatalar.push({ alan: "deger", kod: "deger-gecersiz" });
  }
  if (!tamSayiMi(girdi.enAzTutar, 0, kuponSinirlari.tutarEnCok)) {
    hatalar.push({ alan: "enAzTutar", kod: "tutar-sinir-disi" });
  }
  for (const alan of ["toplamSinir", "kisiBasiSinir"] as const) {
    if (!tamSayiMi(girdi[alan], 1, kuponSinirlari.kullanimEnCok)) {
      hatalar.push({ alan, kod: "sayi-gecersiz" });
    }
  }
  if (girdi.baslangic !== null && girdi.bitis !== null && girdi.bitis <= girdi.baslangic) {
    hatalar.push({ alan: "bitis", kod: "sure-ters" });
  }
  const kayitlar = girdi.kapsamKayitlari;
  if ((girdi.kapsam === "hepsi") !== (kayitlar.length === 0)) {
    hatalar.push({ alan: "kapsamKayitlari", kod: "kapsam-bos" });
  } else if (kayitlar.length > kuponSinirlari.kapsamEnCok) {
    hatalar.push({ alan: "kapsamKayitlari", kod: "kapsam-sinir" });
  } else if (kayitlar.length > 0) {
    const yeniler = kayitlar.filter((kayit) => !onceki?.kapsamKayitlari.includes(kayit));
    const tablo = girdi.kapsam === "urunler" ? urunler : kategoriler;
    const bulunan =
      yeniler.length === 0
        ? []
        : await vt
            .select({ kimlik: tablo.kimlik })
            .from(tablo)
            .where(and(inArray(tablo.kimlik, yeniler), isNull(tablo.silinme_zamani)))
            // Kapsama bağlanırken silinmesin (ürün ve kategori servisleri satırı kilitleyerek siler).
            .for("share");
    if (bulunan.length !== yeniler.length) {
      hatalar.push({ alan: "kapsamKayitlari", kod: "kayit-yok" });
    }
  }
  if (hatalar.length > 0 || kod === undefined) throw new BilinenHata("dogrulama", hatalar);
  const [var_] = await vt
    .select({ kimlik: kuponlar.kimlik })
    .from(kuponlar)
    .where(
      and(
        sql`${adAnahtariSql(kuponlar.kod)} = ${adAnahtariSql(kod)}`,
        isNull(kuponlar.silinme_zamani),
        onceki === undefined ? undefined : ne(kuponlar.kimlik, onceki.kimlik),
      ),
    );
  if (var_ !== undefined) throw new BilinenHata("cakisma", [{ alan: "kod", kod: "kod-var" }]);
  return kod;
};

export const kuponServisi = (site: Site) => {
  const kodKosulu = (kod: string): SQL =>
    site.ayarlar.kuponKoduHarfDuyarli
      ? eq(kuponlar.kod, kod)
      : sql`${adAnahtariSql(kuponlar.kod)} = ${adAnahtariSql(kod)}`;

  const bul = async (
    vt: Veritabani | VeritabaniIslemi,
    kod: string,
    { kilitle = false }: { kilitle?: boolean } = {},
  ): Promise<BulunanKupon | undefined> => {
    const temiz = kodBiciminde(kod);
    if (temiz === undefined) return undefined;
    const sorgu = vt
      .select()
      .from(kuponlar)
      .where(and(kodKosulu(temiz), isNull(kuponlar.silinme_zamani)))
      .limit(1);
    const [satir] = kilitle ? await sorgu.for("update") : await sorgu;
    return satir === undefined ? undefined : hesapKuponu(satir);
  };

  // Ödeme oturumunun kuponu (kartla ödemenin dönüşü, kart 0312): kimlikle. Oturumun geçerli ayırması varsa (süresi
  // dolmamış, siparişe bağlanmamış) kupon arada kapatılmış ya da silinmiş olsa da bulunur ve açık sayılır: müşteri
  // ödemeyi kupon geçerliyken başlattı. Ayırması yoksa kapalı ya da silinmiş kupon bulunmaz.
  const oturumunKuponu = async (
    vt: Veritabani | VeritabaniIslemi,
    kimlik: string,
    oturum: string,
  ): Promise<BulunanKupon | undefined> => {
    const [satir] = await vt.select().from(kuponlar).where(eq(kuponlar.kimlik, kimlik)).limit(1);
    if (satir === undefined) return undefined;
    const [ayirma] = await vt
      .select({ kimlik: kuponKullanimlari.kimlik })
      .from(kuponKullanimlari)
      .where(
        and(
          eq(kuponKullanimlari.kupon_kimligi, kimlik),
          eq(kuponKullanimlari.oturum_kimligi, oturum),
          isNull(kuponKullanimlari.siparis_kimligi),
          isNull(kuponKullanimlari.serbest_zamani),
          gt(kuponKullanimlari.bitis_zamani, sql`now()`),
        ),
      )
      .limit(1);
    if (ayirma !== undefined) return { ...hesapKuponu(satir), acik: true };
    return satir.silinme_zamani === null ? hesapKuponu(satir) : undefined;
  };

  // Ürünlerden kuponun kapsamına girenler (kapsam "hepsi" ise hepsi), tek sorguyla.
  const kapsamdakiUrunler = async (
    vt: Veritabani | VeritabaniIslemi,
    kupon: Pick<BulunanKupon, "kimlik" | "kapsam">,
    urunKimlikleri: readonly string[],
  ): Promise<Set<string>> => {
    if (kupon.kapsam === "hepsi" || urunKimlikleri.length === 0) return new Set(urunKimlikleri);
    if (kupon.kapsam === "urunler") {
      const satirlar = await vt
        .select({ urun: kuponKapsami.urun_kimligi })
        .from(kuponKapsami)
        .where(
          and(
            eq(kuponKapsami.kupon_kimligi, kupon.kimlik),
            inArray(kuponKapsami.urun_kimligi, [...urunKimlikleri]),
          ),
        );
      return new Set(satirlar.flatMap(({ urun }) => (urun === null ? [] : [urun])));
    }
    const { rows } = await vt.execute<{ urun: string }>(sql`
      with recursive agac(kimlik) as (
        select ${kategoriler.kimlik} from ${kategoriler}
          join ${kuponKapsami} on ${kuponKapsami.kategori_kimligi} = ${kategoriler.kimlik}
          where ${kuponKapsami.kupon_kimligi} = ${kupon.kimlik} and ${kategoriler.silinme_zamani} is null
        union
        select ${kategoriler.kimlik} from ${kategoriler}
          join agac on ${kategoriler.ust_kimligi} = agac.kimlik
          where ${kategoriler.silinme_zamani} is null
      )
      select distinct ${urunKategorileri.urun_kimligi} as urun from ${urunKategorileri}
        where ${urunKategorileri.kategori_kimligi} in (select kimlik from agac)
          and ${inArray(urunKategorileri.urun_kimligi, [...urunKimlikleri])}`);
    return new Set(rows.map(({ urun }) => urun));
  };

  // Sayılan kullanımlar: toplam ve (kişi verilirse) kişininki. Oturumun kendi ayırması sayılmaz.
  const kullanimlar = async (
    vt: Veritabani | VeritabaniIslemi,
    kupon: string,
    { kisi, oturum }: { kisi?: KuponKisisi | undefined; oturum?: string | undefined } = {},
  ): Promise<{ toplam: number; kisi?: number }> => {
    const eposta = epostaAnahtari(kisi?.eposta ?? null);
    const kisiKosulu =
      kisi === undefined
        ? sql`false`
        : or(
            kisi.musteri === null
              ? sql`false`
              : eq(kuponKullanimlari.musteri_kimligi, kisi.musteri),
            eposta === null ? sql`false` : eq(kuponKullanimlari.eposta, eposta),
          );
    const [satir] = await vt
      .select({
        toplam: sql<number>`count(*)::int`,
        kisi: sql<number>`count(*) filter (where ${kisiKosulu})::int`,
      })
      .from(kuponKullanimlari)
      .where(
        and(
          eq(kuponKullanimlari.kupon_kimligi, kupon),
          sayilanKullanim(),
          oturum === undefined ? undefined : ne(kuponKullanimlari.oturum_kimligi, oturum),
        ),
      );
    return {
      toplam: satir?.toplam ?? 0,
      ...(kisi === undefined ? {} : { kisi: satir?.kisi ?? 0 }),
    };
  };

  // Sınırlar kilitli kupon satırıyla denetlenir: doluysa "cakisma" (müşteri özeti yeniden görür).
  const sinirlariDenetle = async (
    islem: VeritabaniIslemi,
    kupon: BulunanKupon,
    kisi: KuponKisisi,
    oturum: string,
  ) => {
    const sayilar = await kullanimlar(islem, kupon.kimlik, { kisi, oturum });
    if (kupon.toplamSinir !== null && sayilar.toplam >= kupon.toplamSinir) {
      throw new BilinenHata("cakisma", [{ alan: "kupon", kod: "kupon-sinir-doldu" }]);
    }
    if (kupon.kisiBasiSinir !== null && (sayilar.kisi ?? 0) >= kupon.kisiBasiSinir) {
      throw new BilinenHata("cakisma", [{ alan: "kupon", kod: "kupon-kullanildi" }]);
    }
  };

  // Ödeme oturumu açılırken (stok ayırmasıyla aynı işlemde, aynı süreyle). Kupon kilitlenir, sınırlar yeniden
  // sayılır. Hesap kuponu az önce geçerli bulduysa da kupon arada kapatılmış ya da sınır dolmuş olabilir.
  const ayir = async (
    islem: VeritabaniIslemi,
    girdi: { kupon: string; oturum: string; kisi: KuponKisisi; bitis: Date },
  ): Promise<void> => {
    const [satir] = await islem
      .select()
      .from(kuponlar)
      .where(and(eq(kuponlar.kimlik, girdi.kupon), isNull(kuponlar.silinme_zamani)))
      .for("update");
    if (satir === undefined || !satir.acik) {
      throw new BilinenHata("cakisma", [{ alan: "kupon", kod: "kupon-gecersiz" }]);
    }
    await sinirlariDenetle(islem, hesapKuponu(satir), girdi.kisi, girdi.oturum);
    await islem.insert(kuponKullanimlari).values({
      kupon_kimligi: girdi.kupon,
      oturum_kimligi: girdi.oturum,
      musteri_kimligi: girdi.kisi.musteri,
      eposta: epostaAnahtari(girdi.kisi.eposta),
      bitis_zamani: girdi.bitis,
    });
  };

  // Sipariş kurulurken (siparisiKur'un işleminde): oturumun ayırması siparişe bağlanır. Ayırma süresi dolduysa
  // (kartla ödemede dönüş geç kaldı) sınırlar yeniden sayılır; doluysa "cakisma" (sipariş kurulmaz).
  const siparisiBagla = async (
    islem: VeritabaniIslemi,
    girdi: { kupon: string; oturum: string; siparis: string; kisi: KuponKisisi },
  ): Promise<void> => {
    const [satir] = await islem
      .select()
      .from(kuponlar)
      .where(eq(kuponlar.kimlik, girdi.kupon))
      .for("update");
    if (satir === undefined) throw new Error("Siparişin kuponu yok.");
    const [ayirma] = await islem
      .select({
        kimlik: kuponKullanimlari.kimlik,
        gecerli: sql<boolean>`${kuponKullanimlari.bitis_zamani} > now()`,
      })
      .from(kuponKullanimlari)
      .where(
        and(
          eq(kuponKullanimlari.oturum_kimligi, girdi.oturum),
          eq(kuponKullanimlari.kupon_kimligi, girdi.kupon),
          isNull(kuponKullanimlari.siparis_kimligi),
        ),
      );
    if (ayirma === undefined || !ayirma.gecerli) {
      await sinirlariDenetle(islem, hesapKuponu(satir), girdi.kisi, girdi.oturum);
    }
    if (ayirma === undefined) {
      await islem.insert(kuponKullanimlari).values({
        kupon_kimligi: girdi.kupon,
        oturum_kimligi: girdi.oturum,
        siparis_kimligi: girdi.siparis,
        musteri_kimligi: girdi.kisi.musteri,
        eposta: epostaAnahtari(girdi.kisi.eposta),
        bitis_zamani: sql`now()`,
      });
      return;
    }
    await islem
      .update(kuponKullanimlari)
      .set({ siparis_kimligi: girdi.siparis })
      .where(eq(kuponKullanimlari.kimlik, ayirma.kimlik));
  };

  // Kupon açar (başlangıç verisi, panelin formu ve testler). Kurallar kuponuDenetle'dedir.
  const ekle = async (
    islem: VeritabaniIslemi,
    kim: DegisikligiYapan,
    girdi: KuponEklemeGirdisi,
  ): Promise<string> => {
    const tam = eklemeGirdisi(girdi);
    const kod = await kuponuDenetle(islem, tam);
    const [yazilan] = await islem
      .insert(kuponlar)
      .values({ ...kuponSatiri(tam), kod })
      .returning({ kimlik: kuponlar.kimlik })
      .catch(kodTekrariniCevir);
    if (yazilan === undefined) throw new Error("Kupon yazılamadı.");
    await kapsamiYaz(islem, yazilan.kimlik, tam);
    await degisikligiKaydet(islem, {
      kim,
      islem: "kupon.eklendi",
      kayit: { tur: "kupon", kimlik: yazilan.kimlik },
      eski: null,
      yeni: {
        kod,
        tur: tam.tur,
        deger: tam.deger,
        kapsam: tam.kapsam,
        ...(tam.kapsamKayitlari.length > 0 ? { kapsamKayitlari: tam.kapsamKayitlari } : {}),
      },
    });
    return yazilan.kimlik;
  };

  // Panelin değişikliği (kart 0313, karar 0188): yalnız verilen alanlar değişir. Ekranın gördüğü değişme anı arada
  // değiştiyse hiçbir şey yazılmaz (cakisma, kupon-degisti). Kullanılmış kuponun kodu, türü, indirimi, kapsamı ve
  // "indirimli ürünlerde geçmez"i değişmez (alanın hatası "kullanildi"; veritabanının tetikleyicisi de reddeder);
  // süresi, sınırları, en az tutarı, adı ve açıklığı değişir. Aynı değer kayda girmez, değişme anı değişmez.
  const degistir = async (
    islem: VeritabaniIslemi,
    kim: DegisikligiYapan,
    kimlik: string,
    degisiklik: Partial<KuponGirdisi>,
    gorulen: Date,
  ): Promise<{ degismeZamani: Date }> => {
    const [satir] = await islem
      .select()
      .from(kuponlar)
      .where(and(eq(kuponlar.kimlik, kimligiDuzelt(kimlik)), isNull(kuponlar.silinme_zamani)))
      .for("update");
    if (satir === undefined) throw new BilinenHata("bulunamadi");
    if (satir.degisme_zamani.getTime() !== gorulen.getTime()) {
      throw new BilinenHata("cakisma", [{ alan: "kupon", kod: "kupon-degisti" }]);
    }
    const eski = await kuponGirdisiniOku(islem, satir);
    const yeni: KuponGirdisi = {
      ...eski,
      ...Object.fromEntries(Object.entries(degisiklik).filter(([, deger]) => deger !== undefined)),
    };
    // Kod kırpılmış ve birleşik harfle karşılaştırılır, kayda da öyle girer.
    yeni.kod = kodBiciminde(yeni.kod) ?? yeni.kod;
    if (yeni.kapsam === "hepsi") yeni.kapsamKayitlari = [];
    yeni.kapsamKayitlari = [...new Set(yeni.kapsamKayitlari.map(kimligiDuzelt))].sort();
    const degisenler = kuponAlanlari.filter(
      (alan) => JSON.stringify(eski[alan]) !== JSON.stringify(yeni[alan]),
    );
    if (degisenler.length === 0) return { degismeZamani: satir.degisme_zamani };
    const kilitliDegisenler = degisenler.filter((alan) => kullanilincaKilitli.includes(alan));
    if (kilitliDegisenler.length > 0) {
      const {
        rows: [kullanim],
      } = await islem.execute<{ kullanildi: boolean }>(
        sql`select kupon_kullanildi_mi(${satir.kimlik}) as kullanildi`,
      );
      if (kullanim?.kullanildi === true) {
        throw new BilinenHata(
          "dogrulama",
          kilitliDegisenler.map((alan) => ({ alan, kod: "kullanildi" satisfies KuponHatasi })),
        );
      }
    }
    // Kapsamın türü değişmediyse kalan kayıtlar yeniden denetlenmez.
    const kod = await kuponuDenetle(islem, yeni, {
      kimlik: satir.kimlik,
      kapsamKayitlari: yeni.kapsam === eski.kapsam ? eski.kapsamKayitlari : [],
    });
    const [yazilan] = await islem
      .update(kuponlar)
      .set({ ...kuponSatiri(yeni), kod, degisme_zamani: sql`now()` })
      .where(eq(kuponlar.kimlik, satir.kimlik))
      .returning({ degismeZamani: kuponlar.degisme_zamani })
      .catch(kodTekrariniCevir);
    if (yazilan === undefined) throw new Error("Kupon yazılamadı.");
    if (degisenler.includes("kapsamKayitlari")) {
      await islem.delete(kuponKapsami).where(eq(kuponKapsami.kupon_kimligi, satir.kimlik));
      await kapsamiYaz(islem, satir.kimlik, yeni);
    }
    // Kuponun adı mağaza sahibinin serbest metnidir, kayda girmez (yalnız değiştiği bilinir).
    const kayitDegeri = (girdi: KuponGirdisi) =>
      Object.fromEntries(
        degisenler.map((alan) => {
          if (alan === "ad") return [alan, girdi.ad === null ? null : "[ad]"];
          const deger = girdi[alan];
          return [alan, deger instanceof Date ? deger.toISOString() : deger];
        }),
      );
    await degisikligiKaydet(islem, {
      kim,
      islem: "kupon.degisti",
      kayit: { tur: "kupon", kimlik: satir.kimlik },
      eski: kayitDegeri(eski),
      yeni: kayitDegeri(yeni),
    });
    return yazilan;
  };

  return {
    bul,
    oturumunKuponu,
    kapsamdakiUrunler,
    kullanimlar,
    ayir,
    siparisiBagla,
    kullanimiSerbestBirak: kuponKullaniminiSerbestBirak,
    ekle,
    degistir,
  };
};
