// Marka ve etiketi okuyan ve değiştiren ortak servis (kart 0078, karar 0064). Her grup kendi tablosu,
// bağlantısı, kilidi ve kayıt adlarıyla bu servisi kurar (marka/servis.ts, etiket/servis.ts).
//
// - Yarış: grubun bütün yazmaları kendi işlem kilidini alır; ad ve adres adı tekilliği kilit altında
//   aranır, kısmi tekil indeksler ikinci ağdır.
// - Silme (kullanıcı kararı): grup silinmiş olarak işaretlenir, ürün bağlantıları kalkar; ürünün kendisi
//   ve öteki bilgileri değişmez. Kalkan ürünler silme kaydında listelenir.
// - Her yazım değişiklik kaydına aynı veritabanı işleminde girer (karar 0045).
// - Bir ürünün gruba bağlanması ürün servisindedir (urun/servis.ts): aynı anda silinen gruba
//   bağlanmamak için grup satırını paylaşımlı kilitle okur.
import { randomUUID } from "node:crypto";
import { and, asc, count, eq, isNull, ne, type SQL, sql } from "drizzle-orm";
import type { z } from "zod";
import { BilinenHata } from "../../kapi/zarf.ts";
import type {
  DegisikligiYapan,
  DegisiklikIslemi,
  DegisiklikKayitTuru,
} from "../../kayitlar/degisiklik-islemleri.ts";
import { adAnahtariSql } from "../../metinler/ad-anahtari.ts";
import {
  siteninVeritabani,
  type Veritabani,
  type VeritabaniIslemi,
} from "../../veritabani/baglanti.ts";
import { kimlikMi } from "../../veritabani/kimlik.ts";
import { degisikligiKaydet } from "../degisiklik-kaydi/servis.ts";
import { gorselHazirMi } from "../dosya/servis.ts";
import { adresAdiHatasi, bosAdresAdiBul } from "../gorunurluk/adres-adi-kullanimi.ts";
import type { GrupBaglantisi, GrupTablosu } from "./grup.ts";
import {
  type GrupDegisikligi,
  type GrupGirdisi,
  type grupDegisikligi,
  type grupGirdisi,
  grupHatalari,
} from "./grup-semalari.ts";
import {
  bosUrunListesi,
  type UrunListesi,
  type UrunListesiSecenekleri,
  urunListesi,
} from "./liste.ts";
import { urunler } from "./model.ts";

export type Grup = {
  kimlik: string;
  ad: string;
  adresAdi: string;
  aciklama?: string;
  // Logonun dosya kimliği (kart 0111); yalnız markada girilir.
  logo?: string;
  silindi: boolean;
};

type GrupKaydi = { ad: string; adresAdi: string; aciklama: string | null; logo: string | null };

type Sorun = { alan: string; kod: string };
const bilinenKodlar = new Set<string>(grupHatalari);
const girdiyiDogrula = <T>(sonuc: z.ZodSafeParseResult<T>): T => {
  if (sonuc.success) return sonuc.data;
  throw new BilinenHata(
    "dogrulama",
    sonuc.error.issues.map(
      (sorun): Sorun => ({
        alan: sorun.path.join("."),
        kod: bilinenKodlar.has(sorun.message) ? sorun.message : sorun.code,
      }),
    ),
  );
};
const cakisma = (alan: string, kod: string) => new BilinenHata("cakisma", [{ alan, kod }]);

// Değişiklik kaydına giden değer: boş alan yazılmaz.
const kayitDegeri = (kayit: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(kayit).filter(([, deger]) => deger !== null && deger !== undefined),
  );

export type GrupTanimi = {
  tablo: GrupTablosu;
  baglanti: GrupBaglantisi;
  // İşlem kilidinin adı: grup başına ayrıdır.
  kilit: string;
  // Grubun girdi şemaları (marka/semalar.ts, etiket/semalar.ts): açıklamanın girilip girilmediği oradadır.
  girdiSemasi: ReturnType<typeof grupGirdisi>;
  degisiklikSemasi: ReturnType<typeof grupDegisikligi>;
  kayitTuru: DegisiklikKayitTuru;
  // Eski adreslerin türü (kart 0330): adres adı bu türün kayıtları ve eski adresleri arasında tekildir.
  adresTuru: "marka" | "etiket";
  islemler: { eklendi: DegisiklikIslemi; degisti: DegisiklikIslemi; silindi: DegisiklikIslemi };
};

export const grupServisi = (tanim: GrupTanimi) => {
  const { tablo, baglanti } = tanim;
  const { girdiSemasi, degisiklikSemasi } = tanim;

  const alanlar = {
    kimlik: tablo.kimlik,
    ad: tablo.ad,
    adresAdi: tablo.adres_adi,
    aciklama: tablo.aciklama,
    logo: tablo.logo_kimligi,
    silinme: tablo.silinme_zamani,
  };
  const okunan = (satir: {
    kimlik: string;
    ad: string;
    adresAdi: string;
    aciklama: string | null;
    logo: string | null;
    silinme: Date | null;
  }): Grup => ({
    kimlik: satir.kimlik,
    ad: satir.ad,
    adresAdi: satir.adresAdi,
    ...(satir.aciklama === null ? {} : { aciklama: satir.aciklama }),
    ...(satir.logo === null ? {} : { logo: satir.logo }),
    silindi: satir.silinme !== null,
  });

  // Grubun yazmalarının işlem kilidi. Başlangıç kataloğu da katalog kurulu mu diye bakmadan önce alır.
  const kilidiAl = (islem: VeritabaniIslemi) =>
    islem.execute(sql`select pg_advisory_xact_lock(hashtext(${tanim.kilit}))`);

  const yaz = <T>(vt: Veritabani | VeritabaniIslemi, is: (islem: VeritabaniIslemi) => Promise<T>) =>
    vt.transaction(async (islem) => {
      await kilidiAl(islem);
      return is(islem);
    });

  const adKullaniliyor = async (islem: VeritabaniIslemi, ad: string, haric?: string) =>
    (
      await islem
        .select({ kimlik: tablo.kimlik })
        .from(tablo)
        .where(
          and(
            sql`${adAnahtariSql(tablo.ad)} = ${adAnahtariSql(ad)}`,
            isNull(tablo.silinme_zamani),
            haric === undefined ? undefined : ne(tablo.kimlik, haric),
          ),
        )
    ).length > 0;

  const degisebilen = async (islem: VeritabaniIslemi, kimlik: string): Promise<GrupKaydi> => {
    if (!kimlikMi(kimlik)) throw new BilinenHata("bulunamadi");
    const [satir] = await islem.select(alanlar).from(tablo).where(eq(tablo.kimlik, kimlik));
    if (satir === undefined || satir.silinme !== null) throw new BilinenHata("bulunamadi");
    return {
      ad: satir.ad,
      adresAdi: satir.adresAdi,
      aciklama: satir.aciklama,
      logo: satir.logo,
    };
  };

  // Logo hazır bir görsel olmalı (kategori görseliyle aynı kural, karar 0087): dosya var ve silinmemiş,
  // kendisi bir boyut değil, bütün boyutları tam. Dosya satırı paylaşımlı kilitlenir: aynı anda silinen
  // dosyaya bağlanılmaz.
  const logoyuDenetle = async (islem: VeritabaniIslemi, logo: string | null) => {
    if (logo !== null && (await gorselHazirMi(islem, logo)) !== "hazir") {
      throw new BilinenHata("dogrulama", [{ alan: "logo", kod: "gorsel-gecersiz" }]);
    }
  };

  const ekle = async (
    vt: Veritabani | VeritabaniIslemi,
    kim: DegisikligiYapan,
    ham: GrupGirdisi,
  ): Promise<string> => {
    // Şema açıklamayı yalnız açıklamalı grupta taşır; çıktı bu biçimdedir.
    const girdi = girdiyiDogrula(girdiSemasi.safeParse(ham)) as GrupGirdisi;
    return yaz(vt, async (islem) => {
      if (await adKullaniliyor(islem, girdi.ad)) throw cakisma("ad", "ad-tekrar");
      await logoyuDenetle(islem, girdi.logo ?? null);
      if (girdi.adresAdi !== undefined) {
        const kod = await adresAdiHatasi(islem, tanim.adresTuru, girdi.adresAdi);
        if (kod !== undefined) throw cakisma("adresAdi", kod);
      }
      const kimlik = randomUUID();
      const kayit: GrupKaydi = {
        ad: girdi.ad,
        adresAdi:
          girdi.adresAdi ?? (await bosAdresAdiBul(islem, tanim.adresTuru, girdi.ad, kimlik)),
        aciklama: girdi.aciklama ?? null,
        logo: girdi.logo ?? null,
      };
      await islem.insert(tablo).values({
        kimlik,
        ad: kayit.ad,
        adres_adi: kayit.adresAdi,
        aciklama: kayit.aciklama,
        logo_kimligi: kayit.logo,
      });
      await degisikligiKaydet(islem, {
        kim,
        islem: tanim.islemler.eklendi,
        kayit: { tur: tanim.kayitTuru, kimlik },
        eski: null,
        yeni: kayitDegeri(kayit),
      });
      return kimlik;
    });
  };

  // Yalnız verilen alan değişir. Aynı kalan değişiklik kayda girmez, kayda yalnız değişen alanlar yazılır.
  const degistir = async (
    vt: Veritabani,
    kim: DegisikligiYapan,
    kimlik: string,
    ham: GrupDegisikligi,
  ): Promise<void> => {
    const girdi = girdiyiDogrula(degisiklikSemasi.safeParse(ham)) as GrupDegisikligi;
    await yaz(vt, async (islem) => {
      const eski = await degisebilen(islem, kimlik);
      const yeni: GrupKaydi = {
        ad: girdi.ad ?? eski.ad,
        adresAdi: girdi.adresAdi ?? eski.adresAdi,
        aciklama: girdi.aciklama === undefined ? eski.aciklama : girdi.aciklama,
        logo: girdi.logo === undefined ? eski.logo : girdi.logo,
      };
      const degisen = (["ad", "adresAdi", "aciklama", "logo"] as const).filter(
        (alan) => eski[alan] !== yeni[alan],
      );
      if (degisen.length === 0) return;
      // Logosu sonradan silinen marka, logo değişmedikçe değişebilir (kategori görseliyle aynı).
      if (yeni.logo !== eski.logo) await logoyuDenetle(islem, yeni.logo);
      if (yeni.ad !== eski.ad && (await adKullaniliyor(islem, yeni.ad, kimlik))) {
        throw cakisma("ad", "ad-tekrar");
      }
      if (yeni.adresAdi !== eski.adresAdi) {
        const kod = await adresAdiHatasi(islem, tanim.adresTuru, yeni.adresAdi, kimlik);
        if (kod !== undefined) throw cakisma("adresAdi", kod);
      }
      await islem
        .update(tablo)
        .set({
          ad: yeni.ad,
          adres_adi: yeni.adresAdi,
          aciklama: yeni.aciklama,
          logo_kimligi: yeni.logo,
          guncellenme_zamani: sql`now()`,
        })
        .where(eq(tablo.kimlik, kimlik));
      const sec = (kaynak: GrupKaydi) =>
        Object.fromEntries(degisen.map((alan) => [alan, kaynak[alan]]));
      await degisikligiKaydet(islem, {
        kim,
        islem: tanim.islemler.degisti,
        kayit: { tur: tanim.kayitTuru, kimlik },
        eski: sec(eski),
        yeni: sec(yeni),
      });
    });
  };

  // Silme kuralı (kullanıcı kararı, karar 0064): grup işaretlenir, ürün bağlantıları kalkar.
  const sil = (vt: Veritabani, kim: DegisikligiYapan, kimlik: string) =>
    yaz(vt, async (islem) => {
      const grup = await degisebilen(islem, kimlik);
      await islem
        .update(tablo)
        .set({ silinme_zamani: sql`now()`, guncellenme_zamani: sql`now()` })
        .where(eq(tablo.kimlik, kimlik));
      const kalkan = await islem
        .delete(baglanti)
        .where(eq(baglanti.grup_kimligi, kimlik))
        .returning({ urun: baglanti.urun_kimligi });
      await degisikligiKaydet(islem, {
        kim,
        islem: tanim.islemler.silindi,
        kayit: { tur: tanim.kayitTuru, kimlik },
        eski: {
          ...kayitDegeri(grup),
          ...(kalkan.length > 0 ? { urunler: kalkan.map(({ urun }) => urun).toSorted() } : {}),
        },
        yeni: null,
      });
    });

  // Grup, silinmiş olsa da okunur.
  const oku = async (
    kimlik: string,
    vt: Veritabani = siteninVeritabani(),
  ): Promise<Grup | undefined> => {
    if (!kimlikMi(kimlik)) return undefined;
    const [satir] = await vt.select(alanlar).from(tablo).where(eq(tablo.kimlik, kimlik));
    return satir === undefined ? undefined : okunan(satir);
  };

  // Silinmemiş bütün gruplar, ada göre. Tek sorgu; sayfalama liste motoruyla gelir.
  const hepsiniOku = async (vt: Veritabani = siteninVeritabani()): Promise<Grup[]> =>
    (
      await vt
        .select(alanlar)
        .from(tablo)
        .where(isNull(tablo.silinme_zamani))
        .orderBy(sql`lower(${tablo.ad})`, asc(tablo.kimlik))
    ).map(okunan);

  // Ürünün bu gruba bağlı olduğu koşul (urunler satırı üzerinde). Silinmiş grubun ürünü sağlamaz. Grubun
  // ürün listesi ve vitrinin filtreli listesi (vitrin/urun-listesi/veri.ts) aynı koşulu kullanır. Kimlik
  // geçerli olmalıdır (kimlikMi).
  const urunKosulu = (kimlik: string): SQL => sql`exists (
    select 1 from ${baglanti} join ${tablo} on ${tablo.kimlik} = ${baglanti.grup_kimligi}
    where ${baglanti.urun_kimligi} = ${urunler.kimlik}
      and ${baglanti.grup_kimligi} = ${kimlik}::uuid
      and ${tablo.silinme_zamani} is null
  )`;

  // Grubun ürünleri tek sorguyla (liste.ts). Silinmiş grubun ürünü gelmez.
  const urunleri = async (
    vt: Veritabani,
    kimlik: string,
    secenekler: UrunListesiSecenekleri = {},
  ): Promise<UrunListesi> => {
    if (!kimlikMi(kimlik)) return bosUrunListesi();
    return urunListesi(vt, urunKosulu(kimlik), secenekler);
  };

  // Her gruba bağlı, silinmemiş ürünlerin sayısı (kart 0261): panel satırda gösterir, silme onayı kaç ürünün
  // bağlantısının kalkacağını söyler. Ürünü olmayan grup listede yoktur. Tek sorgu.
  const urunSayilari = async (
    vt: Veritabani = siteninVeritabani(),
  ): Promise<Map<string, number>> => {
    const satirlar = await vt
      .select({ grup: baglanti.grup_kimligi, sayi: count() })
      .from(baglanti)
      .innerJoin(urunler, eq(urunler.kimlik, baglanti.urun_kimligi))
      .where(isNull(urunler.silinme_zamani))
      .groupBy(baglanti.grup_kimligi);
    return new Map(satirlar.map((satir) => [satir.grup, satir.sayi]));
  };

  return { ekle, degistir, sil, oku, hepsiniOku, urunleri, urunSayilari, urunKosulu, kilidiAl };
};
