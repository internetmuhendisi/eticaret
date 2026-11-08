// Sitenin başlangıç kataloğunu (baslangic/katalog.json, kart 0084) bir kez yazar.
//
// - Ne zaman: arka plan süreci açılırken (arka-plan-isleri/surec.ts). Katalog hiç kurulmamışsa
//   (ürün, kategori, marka, etiket ya da özellik tablosunda, silinmiş bile olsa, tek satır yoksa)
//   dosya yazılır.
//   Sonra dosya kullanılmaz: mağaza sahibinin sildiği ürün geri gelmez (karar 0060'taki yol).
// - Nasıl: yalnız servislerle. Doğrulama, adres adı, değişiklik kaydı, fiyat geçmişi ve stok geçmişi
//   panelden girilen bir üründeki gibidir. Yazan, değişiklik kaydında "baslangic-katalog" adlı sistem
//   işlemidir.
// - Bütün katalog tek veritabanı işlemindedir: bir parça yazılamazsa hiçbiri yazılmaz, yarım katalog
//   kalmaz. Servisler kendi işlemlerini bu işlemin içinde kayıt noktası olarak açar. İşlem önce kendi
//   kilidini alır: aynı anda açılan iki süreç kataloğu iki kez yazmaz.
// - Kilit sırası: katalog, kategori, marka, etiket, özellik, ürün; sonra gerekirse vergi (vergi tablosu
//   kurulmamışsa okuma onu kurar). Katalog kurulu mu sorusu bu kilitler alındıktan sonra sorulur: arada
//   panelden açılan bir kategori, marka, etiket, özellik ya da ürün kataloğa karışmaz (kart 0084
//   kontrolü; özellik kart 0100). Hiçbir iş ürün kilidinden sonra kategori, grup ya da özellik kilidini,
//   vergi kilidinden sonra ötekileri almaz.
// - Özellikler ve varyantlar (kart 0100): özellikler ürünlerden önce yazılır, ürünün değerleri ürün
//   girdisiyle gider (liste değeri seçeneğin kimliğine çevrilir). Seçenekli üründe seçenekler panelde
//   olduğu gibi eklenir (ilk seçenek basit birimi siler), her birleşim kendi birimidir; fiyatı ve stoğu
//   o birime yazılır, görseli ürünün galerisindeki öğedir.
// - Galeri görselleri (kart 0087): dosya kaydetme bir veritabanı işleminin içinde çağrılamaz (karar
//   0058). Bu yüzden katalog kurulu değilse görseller önce, her biri kendi işleminde, boyutlarıyla dosya
//   deposuna kaydedilir; katalog işlemi onları kimlikleriyle galeriye bağlar. Katalog yazılmazsa (hata
//   ya da arada başka bir süreç kurdu) bu çağrının kaydettiği görseller ve boyutları silinmiş
//   işaretlenir; kayıtsız dosyaların temizliği kart 0093'tedir. Görsel kaydedilemezse katalog yazılmaz.
import { readFile } from "node:fs/promises";
import { sql } from "drizzle-orm";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { gunluk } from "../../izleme/gunluk.ts";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { dosyaKlasoru, dosyaSil, gorselKaydet } from "../dosya/servis.ts";
import { etiketler } from "../etiket/model.ts";
import { etiketServisi } from "../etiket/servis.ts";
import { siteninFiyatServisi } from "../fiyat/servis.ts";
import { kategoriler } from "../kategori/model.ts";
import { kategoriEkle, kategoriKilidiAl } from "../kategori/servis.ts";
import { markalar } from "../marka/model.ts";
import { markaServisi } from "../marka/servis.ts";
import { ozellikler } from "../ozellik/model.ts";
import { ozellikServisi } from "../ozellik/servis.ts";
import { stokServisi } from "../stok/servis.ts";
import { siteninVergiServisi } from "../vergi/servis.ts";
import type { KatalogBaslangici } from "./baslangic-semasi.ts";
import { urunKilidiAl } from "./kilit.ts";
import { urunler } from "./model.ts";
import { siteninUrunServisi } from "./servis.ts";
import { secenekleriOku } from "./varyant.ts";

export const baslangicKatalogYazari = sistemIslemi("baslangic-katalog");

const kilitle = (islem: VeritabaniIslemi) =>
  islem.execute(sql`select pg_advisory_xact_lock(hashtext('katalog-baslangic'))`);

const bosKatalogMu = (katalog: KatalogBaslangici) =>
  katalog.kategoriler.length === 0 &&
  katalog.markalar.length === 0 &&
  katalog.etiketler.length === 0 &&
  katalog.ozellikler.length === 0 &&
  katalog.urunler.length === 0;

// Silinmiş satır da sayılır: mağaza sahibi her şeyi silse de katalog yeniden yazılmaz.
const kuruluMu = async (islem: VeritabaniIslemi) => {
  for (const tablo of [urunler, kategoriler, markalar, etiketler, ozellikler]) {
    const satir = await islem.select({ kimlik: tablo.kimlik }).from(tablo).limit(1);
    if (satir.length > 0) return true;
  }
  return false;
};

const kimligi = (harita: Map<string, string>, adresAdi: string) => {
  const kimlik = harita.get(adresAdi);
  // Şema bağlantıların dosyada karşılığı olduğunu denetler; buraya düşen bir yazılım hatasıdır.
  if (kimlik === undefined) throw new Error(`Başlangıç kataloğunda ${adresAdi} bulunamadı.`);
  return kimlik;
};

// Katalogdaki görselleri boyutlarıyla dosya deposuna kaydeder; dosya adından kaydın kimliğine. Bir
// görsel kaydedilemezse o ana kadar kaydedilenler silinmiş işaretlenir, hata verilir.
const gorselleriKaydet = async (
  vt: Veritabani,
  site: Site,
  klasor: () => string,
  kaydedilenler: string[],
): Promise<Map<string, string>> => {
  const kimlikler = new Map<string, string>();
  const adlar = new Set(
    site.katalogBaslangici.urunler.flatMap((urun) =>
      urun.galeri.flatMap((oge) => ("gorsel" in oge ? [oge.gorsel] : [])),
    ),
  );
  for (const ad of adlar) {
    const yol = site.katalogGorselleri[ad];
    // Site doğrulaması her adın dosyasını bulur; buraya düşen bir yazılım hatasıdır.
    if (yol === undefined) throw new Error(`Başlangıç kataloğunun görseli bulunamadı: ${ad}.`);
    const sonuc = await gorselKaydet(vt, await readFile(yol), klasor());
    if (!sonuc.tamam) {
      throw new Error(`Başlangıç kataloğunun görseli kaydedilemedi: ${ad} (${sonuc.hata}).`);
    }
    kaydedilenler.push(sonuc.dosya.kimlik, ...Object.values(sonuc.boyutlar).map((d) => d.kimlik));
    kimlikler.set(ad, sonuc.dosya.kimlik);
  }
  return kimlikler;
};

// Katalog yazıldıysa true. Dosya boşsa ya da katalog zaten kurulmuşsa hiçbir şey yazılmaz. klasor,
// galeri görsellerinin kaydedileceği dosya klasörüdür; verilmezse sitenin klasörü (DOSYA_KLASORU),
// yalnız katalogda görsel varsa sorulur.
export const katalogBaslangiciniKur = async (
  vt: Veritabani,
  site: Site,
  klasor: () => string = dosyaKlasoru,
): Promise<boolean> => {
  const katalog = site.katalogBaslangici;
  if (bosKatalogMu(katalog)) return false;
  // Kurulu katalogda görseller boşuna kaydedilmesin. Kesin cevap işlemin içinde, kilitlerden sonradır.
  if (await vt.transaction(kuruluMu)) return false;
  const kaydedilenler: string[] = [];
  let yazildi = false;
  try {
    const gorseller = await gorselleriKaydet(vt, site, klasor, kaydedilenler);
    yazildi = await katalogIsleminiYaz(vt, site, gorseller);
    return yazildi;
  } finally {
    // Temizlik hatası asıl hatanın üstüne yazmaz: günlüğe yazılır, kalan dosyaların temizliği kart
    // 0093'tedir.
    if (!yazildi) {
      for (const kimlik of kaydedilenler) {
        await dosyaSil(vt, kimlik).catch((hata: unknown) =>
          gunluk.hata("başlangıç kataloğunun görseli silinmiş işaretlenemedi", { hata }),
        );
      }
    }
  }
};

const katalogIsleminiYaz = (
  vt: Veritabani,
  site: Site,
  gorseller: Map<string, string>,
): Promise<boolean> => {
  const katalog = site.katalogBaslangici;
  const kim = baslangicKatalogYazari;
  const urunServisi = siteninUrunServisi(site);
  const fiyatServisi = siteninFiyatServisi(site);
  const stok = stokServisi();
  return vt.transaction(async (islem) => {
    await kilitle(islem);
    await kategoriKilidiAl(islem);
    await markaServisi.kilidiAl(islem);
    await etiketServisi.kilidiAl(islem);
    await ozellikServisi.kilidiAl(islem);
    await urunKilidiAl(islem);
    if (await kuruluMu(islem)) return false;

    // Vergi sınıfı adla bulunur; yalnız silinmemiş sınıflar. Vergi tablosu henüz kurulmamışsa bu okuma
    // onu da başlangıç verisiyle kurar.
    const vergiSiniflari = new Map(
      (await siteninVergiServisi(site).tabloyuOku(islem)).map((sinif) => [sinif.ad, sinif.kimlik]),
    );
    const kategoriKimlikleri = new Map<string, string>();
    for (const kategori of katalog.kategoriler) {
      kategoriKimlikleri.set(kategori.adresAdi, await kategoriEkle(islem, kim, kategori));
    }
    const markaKimlikleri = new Map<string, string>();
    for (const marka of katalog.markalar) {
      markaKimlikleri.set(marka.adresAdi, await markaServisi.ekle(islem, kim, marka));
    }
    const etiketKimlikleri = new Map<string, string>();
    for (const etiket of katalog.etiketler) {
      etiketKimlikleri.set(etiket.adresAdi, await etiketServisi.ekle(islem, kim, etiket));
    }

    // Özellik adından kimliğine ve (liste türünde) seçenek adından kimliğine.
    const ozellikKimlikleri = new Map<
      string,
      { kimlik: string; secenekler: Map<string, string> }
    >();
    for (const ozellik of katalog.ozellikler) {
      const kimlik = await ozellikServisi.ekle(islem, kim, ozellik);
      const okunan = await ozellikServisi.oku(kimlik, islem);
      if (okunan === undefined) throw new Error(`${ozellik.ad} özelliği okunamadı.`);
      ozellikKimlikleri.set(ozellik.ad, {
        kimlik,
        secenekler: new Map(okunan.secenekler.map((s) => [s.ad, s.kimlik])),
      });
    }

    // İlgili ürünler bütün ürünler yazıldıktan sonra bağlanır: dosyada sonra gelen ürün de seçilebilir.
    const urunKimlikleri = new Map<string, string>();
    for (const urun of katalog.urunler) {
      const {
        fiyat,
        stok: miktar,
        ilgiliUrunler,
        galeri,
        vergiSinifi,
        kategoriler,
        etiketler,
        marka,
        ozellikler: degerler,
        secenekler,
        birlesimler,
        ...alanlar
      } = urun;
      const sinif = vergiSinifi === null ? null : vergiSiniflari.get(vergiSinifi);
      if (sinif === undefined) {
        throw new Error(
          `Başlangıç kataloğundaki ${urun.adresAdi} ürününün vergi sınıfı yok: ${vergiSinifi}.`,
        );
      }
      const kimlik = await urunServisi.urunEkle(islem, kim, {
        ...alanlar,
        vergiSinifi: sinif,
        kategoriler: kategoriler.map((ad) => kimligi(kategoriKimlikleri, ad)),
        etiketler: etiketler.map((ad) => kimligi(etiketKimlikleri, ad)),
        marka: marka === undefined ? null : kimligi(markaKimlikleri, marka),
        ozellikler: degerler.map(({ ozellik, deger }) => {
          const tanim = ozellikKimlikleri.get(ozellik);
          if (tanim === undefined)
            throw new Error(`Başlangıç kataloğunda ${ozellik} özelliği yok.`);
          const secenek = typeof deger === "string" ? tanim.secenekler.get(deger) : undefined;
          return { ozellik: tanim.kimlik, deger: secenek ?? deger };
        }),
      });
      urunKimlikleri.set(urun.adresAdi, kimlik);
      const galeriOgeleri = new Map<string, string>();
      for (const oge of galeri) {
        if ("video" in oge) {
          await urunServisi.galeriyeVideoEkle(islem, kim, kimlik, {
            adres: oge.video,
            alternatifMetin: oge.alternatifMetin,
          });
          continue;
        }
        const dosya = gorseller.get(oge.gorsel);
        if (dosya === undefined) throw new Error(`Görsel kaydedilmemiş: ${oge.gorsel}.`);
        galeriOgeleri.set(
          oge.gorsel,
          await urunServisi.galeriyeGorselEkle(islem, kim, kimlik, {
            dosya,
            alternatifMetin: oge.alternatifMetin,
          }),
        );
      }
      const birimiDoldur = async (
        birim: string,
        birimFiyati: typeof fiyat,
        birimStogu: number | undefined,
      ) => {
        if (birimFiyati !== undefined) await fiyatServisi.fiyatYaz(islem, kim, birim, birimFiyati);
        if (birimStogu !== undefined && birimStogu > 0) {
          await stok.stokDuzelt(islem, kim, birim, {
            gorulenMiktar: 0,
            yeniMiktar: birimStogu,
            sebep: "yeni-mal",
          });
        }
      };
      if (secenekler.length === 0) {
        const birim = (await urunServisi.urunuOku(islem, kimlik))?.birimler[0]?.kimlik;
        if (birim === undefined) throw new Error(`${urun.adresAdi} ürününün birimi okunamadı.`);
        await birimiDoldur(birim, fiyat, miktar);
        continue;
      }
      for (const secenek of secenekler) await urunServisi.secenekEkle(islem, kim, kimlik, secenek);
      // Seçeneklerin sırasıyla, değer adından kimliğine.
      const degerKimlikleri = (
        (await secenekleriOku(islem, [kimlik], { silinmisler: false })).get(kimlik) ?? []
      ).map((secenek) => new Map(secenek.degerler.map((d) => [d.ad, d.kimlik])));
      for (const {
        degerler: adlar,
        gorsel,
        fiyat: birimFiyati,
        stok: birimStogu,
        ...birimAlanlari
      } of birlesimler) {
        const birim = await urunServisi.birlesimEkle(islem, kim, kimlik, {
          ...birimAlanlari,
          degerler: adlar.map((ad, sira) => {
            const deger = degerKimlikleri[sira]?.get(ad);
            if (deger === undefined) throw new Error(`${urun.adresAdi} ürününde ${ad} değeri yok.`);
            return deger;
          }),
          ...(gorsel === undefined ? {} : { gorsel: kimligi(galeriOgeleri, gorsel) }),
        });
        await birimiDoldur(birim, birimFiyati, birimStogu);
      }
    }
    for (const urun of katalog.urunler) {
      if (urun.ilgiliUrunler.length === 0) continue;
      await urunServisi.urunDegistir(islem, kim, kimligi(urunKimlikleri, urun.adresAdi), {
        ilgiliUrunler: urun.ilgiliUrunler.map((ad) => kimligi(urunKimlikleri, ad)),
      });
    }
    return true;
  });
};
