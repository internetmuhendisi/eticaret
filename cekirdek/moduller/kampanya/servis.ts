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
  type KuponKapsami,
  type KuponTuru,
  kuponKoduKalibi,
  kuponSinirlari,
} from "../../kayitlar/kampanya.ts";
import { adAnahtariSql } from "../../metinler/ad-anahtari.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { degisikligiKaydet } from "../degisiklik-kaydi/servis.ts";
import { kategoriler, urunKategorileri } from "../kategori/model.ts";
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

  // Ödeme başarısız ya da müşteri yeniden onayladı: oturumun siparişe bağlanmamış ayırması gider.
  const ayirmayiBirak = async (islem: VeritabaniIslemi, oturum: string): Promise<void> => {
    await islem
      .delete(kuponKullanimlari)
      .where(
        and(
          eq(kuponKullanimlari.oturum_kimligi, oturum),
          isNull(kuponKullanimlari.siparis_kimligi),
        ),
      );
  };

  // İptal ve tam iade (karar 0185): siparişin kullanımı geri verilir. Kısmi iade çağırmaz.
  const kullanimiSerbestBirak = async (islem: VeritabaniIslemi, siparis: string): Promise<void> => {
    await islem
      .update(kuponKullanimlari)
      .set({ serbest_zamani: sql`now()` })
      .where(
        and(
          eq(kuponKullanimlari.siparis_kimligi, siparis),
          isNull(kuponKullanimlari.serbest_zamani),
        ),
      );
  };

  // Kupon açar (başlangıç verisi ve testler; panelin formu kart 0313). Kod tekilliği harf ayrımsızdır.
  const ekle = async (
    islem: VeritabaniIslemi,
    kim: DegisikligiYapan,
    girdi: {
      kod: string;
      ad?: string | null;
      tur: KuponTuru;
      deger: number;
      kapsam: KuponKapsami;
      kapsamKayitlari?: readonly string[];
      enAzTutar?: number | null;
      baslangic?: Date | null;
      bitis?: Date | null;
      toplamSinir?: number | null;
      kisiBasiSinir?: number | null;
      indirimdeGecmez?: boolean;
      acik?: boolean;
    },
  ): Promise<string> => {
    const kod = kodBiciminde(girdi.kod);
    if (kod === undefined) throw new BilinenHata("dogrulama", [{ alan: "kod", kod: "gecersiz" }]);
    const kapsamKayitlari = [...new Set(girdi.kapsamKayitlari ?? [])];
    if ((girdi.kapsam === "hepsi") !== (kapsamKayitlari.length === 0)) {
      throw new BilinenHata("dogrulama", [{ alan: "kapsamKayitlari", kod: "gecersiz" }]);
    }
    const [var_] = await islem
      .select({ kimlik: kuponlar.kimlik })
      .from(kuponlar)
      .where(
        and(
          sql`${adAnahtariSql(kuponlar.kod)} = ${adAnahtariSql(kod)}`,
          isNull(kuponlar.silinme_zamani),
        ),
      );
    if (var_ !== undefined) throw new BilinenHata("cakisma", [{ alan: "kod", kod: "kod-var" }]);
    const [yazilan] = await islem
      .insert(kuponlar)
      .values({
        kod,
        ad: girdi.ad ?? null,
        tur: girdi.tur,
        deger: girdi.deger,
        kapsam: girdi.kapsam,
        en_az_tutar: girdi.enAzTutar ?? null,
        baslangic_zamani: girdi.baslangic ?? null,
        bitis_zamani: girdi.bitis ?? null,
        toplam_sinir: girdi.toplamSinir ?? null,
        kisi_basi_sinir: girdi.kisiBasiSinir ?? null,
        indirimde_gecmez: girdi.indirimdeGecmez ?? false,
        acik: girdi.acik ?? true,
      })
      .returning({ kimlik: kuponlar.kimlik });
    if (yazilan === undefined) throw new Error("Kupon yazılamadı.");
    if (kapsamKayitlari.length > 0) {
      await islem.insert(kuponKapsami).values(
        kapsamKayitlari.map((kayit) => ({
          kupon_kimligi: yazilan.kimlik,
          kayit_kimligi: kayit,
          ...(girdi.kapsam === "urunler" ? { urun_kimligi: kayit } : { kategori_kimligi: kayit }),
        })),
      );
    }
    await degisikligiKaydet(islem, {
      kim,
      islem: "kupon.eklendi",
      kayit: { tur: "kupon", kimlik: yazilan.kimlik },
      eski: null,
      yeni: {
        kod,
        tur: girdi.tur,
        deger: girdi.deger,
        kapsam: girdi.kapsam,
        ...(kapsamKayitlari.length > 0 ? { kapsamKayitlari } : {}),
      },
    });
    return yazilan.kimlik;
  };

  return {
    bul,
    kapsamdakiUrunler,
    kullanimlar,
    ayir,
    siparisiBagla,
    ayirmayiBirak,
    kullanimiSerbestBirak,
    ekle,
  };
};
