// Fiyat girişinin (vergi dahil ya da hariç) değişikliği (kart 0326, karar 0185, 0201). Mağaza sahibi girişi
// değiştirince kayıtlı tutarlar yeni girişe çevrilir, müşterinin gördüğü fiyat değişmez (giris-cevirisi.ts).
//
// - Çevrilen tutarlar: silinmemiş ürünlerin silinmemiş birimlerinin satış ve indirimli fiyatı (sitenin para
//   biriminde), kargo ücreti, ücretsiz kargo sınırı, tutar kuponlarının indirimi ve kuponların en az sepet tutarı
//   (kullanılmışlar da; kullanıcı kararı). Ürün fiyatı ürünün sınıfının, kargo ücreti kargonun sınıfının oranıyla
//   çevrilir. Birden çok oranlı tutarlar (sınır, kupon) sitede en çok ürünü olan sınıfın oranıyla (kullanıcı kararı).
//   Oran, vitrinin fiyatı gösterirken kullandığı bölgenindir (mağaza adresi). Vergisiz ürün ve verilmiş sipariş
//   değişmez.
// - Önizleme hiçbir şey yazmaz: kaç fiyatın çevrileceğini ve müşterinin göreceği fiyatı 1 kuruş değişecek
//   birimleri söyler, bir sürüm (surum) verir. Uygulama aynı planı kilitlerin içinde yeniden kurar; sürüm
//   önizlemeninkinden farklıysa (arada fiyat, kupon, kargo ya da vergi tablosu değişti) hiçbir şey yazmaz.
// - Uygulama tek işlemdir: ürün kilidi (fiyat yazımlarıyla sıraya girer), kupon satırları, girişin değişikliği,
//   fiyatlar (geçmişleriyle), kuponlar ve ayarlar. Biri düşerse hiçbiri kalmaz.
// - Fiyat geçmişi değiştirilmez: bir geçmiş satırının hangi girişle yazıldığı girişin değişikliklerinden bulunur
//   (satirinGirisi); eski fiyat hesabı satırları bugünkü girişe çevirerek karşılaştırır (gosterim.ts).
import { createHash } from "node:crypto";
import { and, asc, count, eq, gt, isNotNull, isNull, notExists, sql } from "drizzle-orm";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { degisikligiKaydet } from "../degisiklik-kaydi/servis.ts";
import { kuponlar } from "../kampanya/model.ts";
import { magazaAyarlari } from "../magaza-ayarlari/model.ts";
import { siteninServisi } from "../magaza-ayarlari/servis.ts";
import { odemeOturumlari } from "../odeme/model.ts";
import { siparisler } from "../siparis/model.ts";
import { urunKilidiAl } from "../urun/kilit.ts";
import { urunBirimleri, urunler } from "../urun/model.ts";
import { secenekleriOku } from "../urun/varyant.ts";
import type { FiyatGirisi } from "../vergi/semalar.ts";
import { siteninVergiServisi, vergiKilidiAl } from "../vergi/servis.ts";
import {
  type CeviriBaglami,
  type CevrilmisTutar,
  gosterimeCevir,
  yeniGiriseCevir,
} from "./giris-cevirisi.ts";
import type { FiyatGirisiHatasi } from "./giris-hatalari.ts";
import { birimFiyatlari, fiyatGirisiGecmisi } from "./model.ts";
import { siteninFiyatServisi } from "./servis.ts";

// Servisin iş kuralı hataları; ekran kodu alanın hatası olarak okur.
const isHatasi = (kod: FiyatGirisiHatasi) => new BilinenHata("is-kurali", [{ alan: "yeni", kod }]);

export type GirisDegisikligi = { zaman: Date; onceki: FiyatGirisi; yeni: FiyatGirisi };

// Bir geçmiş satırının girişi: zamanından önceki (ya da aynı anki) son değişikliğin yenisi; ilk değişiklikten önce
// yazılmışsa onun öncekisi; değişiklik yoksa bugünkü giriş. Değişiklikler zamana göre sıralı verilir.
export const satirinGirisi = (
  zaman: Date,
  degisiklikler: readonly GirisDegisikligi[],
  bugunku: FiyatGirisi,
): FiyatGirisi => {
  let giris: FiyatGirisi | undefined;
  for (const degisiklik of degisiklikler) {
    if (degisiklik.zaman.getTime() <= zaman.getTime()) giris = degisiklik.yeni;
    else return giris ?? degisiklik.onceki;
  }
  return giris ?? bugunku;
};

export const girisDegisiklikleriniOku = async (
  vt: Veritabani | VeritabaniIslemi,
): Promise<GirisDegisikligi[]> =>
  (
    await vt
      .select({
        zaman: fiyatGirisiGecmisi.zaman,
        onceki: fiyatGirisiGecmisi.onceki,
        yeni: fiyatGirisiGecmisi.yeni,
      })
      .from(fiyatGirisiGecmisi)
      .orderBy(asc(fiyatGirisiGecmisi.zaman), asc(fiyatGirisiGecmisi.kimlik))
  ).map((satir) => ({
    zaman: satir.zaman,
    onceki: satir.onceki as FiyatGirisi,
    yeni: satir.yeni as FiyatGirisi,
  }));

export type CevrilenFiyat = {
  birim: string;
  urun: string;
  eskiSatis: number;
  eskiIndirimli: number | null;
  satis: CevrilmisTutar;
  indirimli: CevrilmisTutar | null;
};

export type CevrilenKupon = {
  kimlik: string;
  kod: string;
  eskiDeger: number;
  eskiEnAz: number | null;
  deger: CevrilmisTutar | null;
  enAz: CevrilmisTutar | null;
};

export type GirisPlani = {
  eski: FiyatGirisi;
  yeni: FiyatGirisi;
  fiyatlar: CevrilenFiyat[];
  // Kayıtlı kargo ücreti ve ücretsiz kargo sınırı: bugünkü (eski) ve çevrilmiş.
  eskiKargoUcreti: number;
  kargoUcreti: CevrilmisTutar;
  eskiUcretsizKargoSiniri: number | null;
  ucretsizKargoSiniri: CevrilmisTutar | null;
  kuponlar: CevrilenKupon[];
  // Birden çok oranlı tutarların (sınır, kupon) çevrildiği sınıf; vergili ürün yoksa yoktur (tutarlar değişmez).
  sepetSinifi: { kimlik: string; ad: string } | null;
  // Planın girdilerinin özeti: önizleme ile uygulama arasında bir şey değiştiyse farklıdır.
  surum: string;
};

// Kayıtlı tutarı değişen birimler (çevrilen fiyatlar).
export const kayitliFiyatDegisirMi = (fiyat: CevrilenFiyat): boolean =>
  fiyat.satis.tutar !== fiyat.eskiSatis || (fiyat.indirimli?.tutar ?? null) !== fiyat.eskiIndirimli;

// Kayıtlı tutarı değişen kuponlar.
export const kuponDegisirMi = (kupon: CevrilenKupon): boolean =>
  (kupon.deger !== null && kupon.deger.tutar !== kupon.eskiDeger) ||
  (kupon.enAz !== null && kupon.enAz.tutar !== kupon.eskiEnAz);

// Müşterinin gördüğü tutarı değişen birimler (en çok 1 kuruş).
export const gorunenDegisirMi = (fiyat: CevrilenFiyat): boolean =>
  fiyat.satis.onceGorunen !== fiyat.satis.sonraGorunen ||
  (fiyat.indirimli !== null && fiyat.indirimli.onceGorunen !== fiyat.indirimli.sonraGorunen);

export const fiyatGirisiServisi = (site: Site) => {
  const fiyatServisi = siteninFiyatServisi(site);

  // Planı kurar; hiçbir şey yazmaz. Bölge bulunamazsa vergi hesabının bilinen hatası (vergi-bolgesi-yok) döner.
  const planKur = async (
    vt: Veritabani | VeritabaniIslemi,
    yeni: FiyatGirisi,
  ): Promise<GirisPlani> => {
    const [ayarlar, tablo] = await Promise.all([
      siteninServisi(site).oku(vt),
      siteninVergiServisi(site).tabloyuOku(vt, { silinmisSiniflar: true }),
    ]);
    const eski = ayarlar.fiyatGirisi;
    const magaza = ayarlar.magazaAdresi;
    const baglam: CeviriBaglami = {
      ayarlar,
      tablo,
      ...(magaza === undefined
        ? {}
        : { magaza: { ulke: magaza.ulke, il: magaza.il, postaKodu: magaza.postaKodu } }),
    };
    // Bölge bulunamazsa (mağaza adresi yok ya da vergi tablosunda değil) hiçbir tutar çevrilemez.
    const gorunen = (tutar: number, sinif: string | null) =>
      gosterimeCevir(baglam, tutar, sinif, yeni);
    const cevir = (tutar: number, sinif: string | null) => {
      try {
        return yeniGiriseCevir(baglam, tutar, sinif, eski, yeni);
      } catch (hata) {
        if (hata instanceof BilinenHata && hata.kod === "is-kurali") {
          throw isHatasi("vergi-bolgesi-yok");
        }
        throw hata;
      }
    };

    const [birimSatirlari, sinifSayilari, kuponSatirlari] = await Promise.all([
      vt
        .select({
          birim: birimFiyatlari.birim_kimligi,
          urun: urunBirimleri.urun_kimligi,
          sinif: urunler.vergi_sinifi_kimligi,
          satis: birimFiyatlari.satis_fiyati,
          indirimli: birimFiyatlari.indirimli_fiyat,
        })
        .from(birimFiyatlari)
        .innerJoin(urunBirimleri, eq(urunBirimleri.kimlik, birimFiyatlari.birim_kimligi))
        .innerJoin(urunler, eq(urunler.kimlik, urunBirimleri.urun_kimligi))
        .where(
          and(
            isNull(urunBirimleri.silinme_zamani),
            isNull(urunler.silinme_zamani),
            eq(birimFiyatlari.para_birimi, site.ayarlar.paraBirimi),
          ),
        )
        .orderBy(asc(birimFiyatlari.birim_kimligi)),
      vt
        .select({ sinif: urunler.vergi_sinifi_kimligi, sayi: count() })
        .from(urunler)
        .where(and(isNull(urunler.silinme_zamani), isNotNull(urunler.vergi_sinifi_kimligi)))
        .groupBy(urunler.vergi_sinifi_kimligi),
      vt
        .select({
          kimlik: kuponlar.kimlik,
          kod: kuponlar.kod,
          tur: kuponlar.tur,
          deger: kuponlar.deger,
          enAz: kuponlar.en_az_tutar,
        })
        .from(kuponlar)
        .where(isNull(kuponlar.silinme_zamani))
        .orderBy(asc(kuponlar.kimlik)),
    ]);

    const fiyatlar: CevrilenFiyat[] = birimSatirlari.map((satir) => {
      const satis = cevir(satir.satis, satir.sinif);
      let indirimli = satir.indirimli === null ? null : cevir(satir.indirimli, satir.sinif);
      // İndirimli fiyat satış fiyatından küçük kalır (fiyat kuralı): yuvarlamada eşitlenirse bir kuruş aşağı.
      if (indirimli !== null && indirimli.tutar >= satis.tutar) {
        const tutar = satis.tutar - 1;
        indirimli = {
          ...indirimli,
          tutar,
          sonraGorunen: gorunen(tutar, satir.sinif),
        };
      }
      return {
        birim: satir.birim,
        urun: satir.urun,
        eskiSatis: satir.satis,
        eskiIndirimli: satir.indirimli,
        satis,
        indirimli,
      };
    });

    // En çok ürünü olan sınıf; eşitlikte tablonun sırası. Silinmiş sınıf da ürünlerin sınıfıdır (karar 0060).
    const siralar = new Map(tablo.map((sinif, i) => [sinif.kimlik, i]));
    const [enCok] = [...sinifSayilari].sort(
      (a, b) =>
        b.sayi - a.sayi ||
        (siralar.get(a.sinif ?? "") ?? Infinity) - (siralar.get(b.sinif ?? "") ?? Infinity),
    );
    const sepetSinifi =
      enCok?.sinif === undefined || enCok.sinif === null
        ? null
        : { kimlik: enCok.sinif, ad: tablo.find((s) => s.kimlik === enCok.sinif)?.ad ?? "" };
    const sepetSinifKimligi = sepetSinifi?.kimlik ?? null;
    // Vergi hesabıyla aynı: seçiliyken silinen sınıf da kargonun sınıfıdır (vergi/hesap.ts).
    const kargoSinifi = tablo.find((sinif) => sinif.kargo)?.kimlik ?? null;

    const kuponlarinPlani: CevrilenKupon[] = kuponSatirlari.map((kupon) => ({
      kimlik: kupon.kimlik,
      kod: kupon.kod,
      eskiDeger: kupon.deger,
      eskiEnAz: kupon.enAz,
      deger: kupon.tur === "tutar" ? cevir(kupon.deger, sepetSinifKimligi) : null,
      enAz: kupon.enAz === null ? null : cevir(kupon.enAz, sepetSinifKimligi),
    }));
    const sinir = ayarlar.ucretsizKargoSiniri;

    const surum = createHash("sha256")
      .update(
        JSON.stringify({
          eski,
          yeni,
          vergiAcik: ayarlar.vergiAcik,
          gosterim: ayarlar.fiyatGosterimi,
          yuvarlama: ayarlar.vergiYuvarlama,
          magaza: baglam.magaza ?? null,
          tablo: tablo.map((s) => [s.kimlik, s.silindi, s.kargo, s.oranlar]),
          birimler: birimSatirlari,
          siniflar: sinifSayilari,
          kuponlar: kuponSatirlari,
          kargo: [ayarlar.kargoUcreti, sinir ?? null],
        }),
      )
      .digest("hex")
      .slice(0, 32);

    return {
      eski,
      yeni,
      fiyatlar,
      eskiKargoUcreti: ayarlar.kargoUcreti,
      kargoUcreti: cevir(ayarlar.kargoUcreti, kargoSinifi),
      eskiUcretsizKargoSiniri: sinir ?? null,
      ucretsizKargoSiniri: sinir === undefined ? null : cevir(sinir, sepetSinifKimligi),
      kuponlar: kuponlarinPlani,
      sepetSinifi,
      surum,
    };
  };

  // Önizleme: yalnız okur. Giriş zaten buysa iş kuralı hatası (ayni-giris).
  const onizle = async (vt: Veritabani, yeni: FiyatGirisi): Promise<GirisPlani> => {
    const plan = await planKur(vt, yeni);
    if (plan.eski === yeni) throw isHatasi("ayni-giris");
    return plan;
  };

  // Müşterinin gördüğü tutarı değişen birimlerin ürün adı ve seçimi (değerlerin adları, seçeneklerin sırasıyla).
  const birimAdlari = async (
    vt: Veritabani,
    fiyatlar: readonly CevrilenFiyat[],
  ): Promise<Map<string, { urun: string; secim: string[] }>> => {
    const sonuc = new Map<string, { urun: string; secim: string[] }>();
    if (fiyatlar.length === 0) return sonuc;
    const urunKimlikleri = [...new Set(fiyatlar.map((f) => f.urun))];
    const [adlar, birimler, secenekler] = await Promise.all([
      vt
        .select({ kimlik: urunler.kimlik, ad: urunler.ad })
        .from(urunler)
        .where(sql`${urunler.kimlik} in ${urunKimlikleri}`),
      vt
        .select({ kimlik: urunBirimleri.kimlik, birlesim: urunBirimleri.birlesim })
        .from(urunBirimleri)
        .where(sql`${urunBirimleri.kimlik} in ${fiyatlar.map((f) => f.birim)}`),
      secenekleriOku(vt, urunKimlikleri, { silinmisler: false }),
    ]);
    const urunAdi = new Map(adlar.map((u) => [u.kimlik, u.ad]));
    const birlesimler = new Map(birimler.map((b) => [b.kimlik, b.birlesim]));
    for (const fiyat of fiyatlar) {
      const degerler = new Set((birlesimler.get(fiyat.birim) ?? "").split(",").filter(Boolean));
      const secim: string[] = [];
      for (const secenek of secenekler.get(fiyat.urun) ?? []) {
        const deger = secenek.degerler.find((d) => degerler.has(d.kimlik));
        if (deger !== undefined) secim.push(deger.ad);
      }
      sonuc.set(fiyat.birim, { urun: urunAdi.get(fiyat.urun) ?? "", secim });
    }
    return sonuc;
  };

  // Uygulama: kilitlerin içinde planı yeniden kurar; ekranın gördüğü sürüm değilse cakisma, hiçbir şey yazılmaz.
  const uygula = async (
    vt: Veritabani,
    kim: DegisikligiYapan,
    girdi: { yeni: FiyatGirisi; surum: string },
  ): Promise<GirisPlani> =>
    vt.transaction(async (islem) => {
      // Kilit sırası: ürün (fiyat yazımları), kuponlar (eklenen kupon da beklesin), mağaza ayarları (kargo, vergi
      // ayarları), vergi tablosu. Plan kilitlerin içinde kurulur: önizlemeden sonra değişen her şey sürümü değiştirir.
      await urunKilidiAl(islem);
      await islem.execute(sql`lock table ${kuponlar} in exclusive mode`);
      await siteninServisi(site).oku(islem);
      await islem.select({ kimlik: magazaAyarlari.kimlik }).from(magazaAyarlari).for("update");
      await vergiKilidiAl(islem);
      // Süren ödeme (siparişe dönmemiş, süresi dolmamış oturum) varken çevrilmez: çok adetli satırda toplam
      // yuvarlamayla kayabilir, ödemenin toplamı tutmaz ve sipariş kurulamazdı.
      const [acik] = await islem
        .select({ sayi: count() })
        .from(odemeOturumlari)
        .where(
          and(
            gt(odemeOturumlari.bitis_zamani, sql`now()`),
            notExists(
              islem
                .select({ bir: sql`1` })
                .from(siparisler)
                .where(eq(siparisler.oturum_kimligi, odemeOturumlari.kimlik)),
            ),
          ),
        );
      if ((acik?.sayi ?? 0) > 0) throw isHatasi("acik-odeme");
      const plan = await planKur(islem, girdi.yeni);
      if (plan.eski === girdi.yeni) throw isHatasi("ayni-giris");
      if (plan.surum !== girdi.surum) throw new BilinenHata("cakisma");
      const [degisiklik] = await islem
        .insert(fiyatGirisiGecmisi)
        .values({ zaman: sql`clock_timestamp()`, onceki: plan.eski, yeni: plan.yeni })
        .returning({ kimlik: fiyatGirisiGecmisi.kimlik });
      if (degisiklik === undefined) throw new Error("Fiyat girişinin değişikliği yazılamadı.");
      await fiyatServisi.cevrilmisFiyatlariYaz(
        islem,
        kim,
        plan.fiyatlar.map((f) => ({
          birim: f.birim,
          satisFiyati: f.satis.tutar,
          indirimliFiyat: f.indirimli?.tutar ?? null,
        })),
      );
      // Kullanılmış kuponun değeri yalnız bu işlemde değişebilir (kupon_degismezlik, değişiklik 0071).
      await islem.execute(sql`select set_config('eticaret.fiyat_girisi_cevirisi', 'acik', true)`);
      for (const kupon of plan.kuponlar) {
        if (!kuponDegisirMi(kupon)) continue;
        const yeniDeger =
          kupon.deger !== null && kupon.deger.tutar !== kupon.eskiDeger
            ? kupon.deger.tutar
            : undefined;
        const yeniEnAz =
          kupon.enAz !== null && kupon.enAz.tutar !== kupon.eskiEnAz ? kupon.enAz.tutar : undefined;
        await islem
          .update(kuponlar)
          .set({
            ...(yeniDeger === undefined ? {} : { deger: yeniDeger }),
            ...(yeniEnAz === undefined ? {} : { en_az_tutar: yeniEnAz }),
            degisme_zamani: sql`now()`,
          })
          .where(eq(kuponlar.kimlik, kupon.kimlik));
        await degisikligiKaydet(islem, {
          kim,
          islem: "kupon.degisti",
          kayit: { tur: "kupon", kimlik: kupon.kimlik },
          eski: {
            ...(yeniDeger === undefined ? {} : { deger: kupon.eskiDeger }),
            ...(yeniEnAz === undefined ? {} : { enAzTutar: kupon.eskiEnAz }),
          },
          yeni: {
            ...(yeniDeger === undefined ? {} : { deger: yeniDeger }),
            ...(yeniEnAz === undefined ? {} : { enAzTutar: yeniEnAz }),
          },
        });
      }
      await siteninServisi(site).degistir(
        islem,
        kim,
        {
          fiyatGirisi: plan.yeni,
          kargoUcreti: plan.kargoUcreti.tutar,
          ...(plan.ucretsizKargoSiniri === null
            ? {}
            : { ucretsizKargoSiniri: plan.ucretsizKargoSiniri.tutar }),
        },
        { kendiIslevi: true },
      );
      await degisikligiKaydet(islem, {
        kim,
        islem: "fiyat-girisi.degisti",
        kayit: { tur: "fiyat-girisi", kimlik: degisiklik.kimlik },
        eski: { fiyatGirisi: plan.eski },
        yeni: {
          fiyatGirisi: plan.yeni,
          fiyatSayisi: plan.fiyatlar.filter(kayitliFiyatDegisirMi).length,
          gorunenDegisen: plan.fiyatlar.filter(gorunenDegisirMi).length,
        },
      });
      return plan;
    });

  return { planKur, onizle, uygula, birimAdlari };
};
