// Sitenin başlangıç kataloğunu (baslangic/katalog.json, kart 0084) bir kez yazar.
//
// - Ne zaman: arka plan süreci açılırken (arka-plan-isleri/surec.ts). Katalog hiç kurulmamışsa
//   (ürün, kategori, marka ya da etiket tablosunda, silinmiş bile olsa, tek satır yoksa) dosya yazılır.
//   Sonra dosya kullanılmaz: mağaza sahibinin sildiği ürün geri gelmez (karar 0060'taki yol).
// - Nasıl: yalnız servislerle. Doğrulama, adres adı, değişiklik kaydı, fiyat geçmişi ve stok geçmişi
//   panelden girilen bir üründeki gibidir. Yazan, değişiklik kaydında "baslangic-katalog" adlı sistem
//   işlemidir.
// - Bütün katalog tek veritabanı işlemindedir: bir parça yazılamazsa hiçbiri yazılmaz, yarım katalog
//   kalmaz. Servisler kendi işlemlerini bu işlemin içinde kayıt noktası olarak açar. İşlem önce kendi
//   kilidini alır: aynı anda açılan iki süreç kataloğu iki kez yazmaz.
// - Kilit sırası: katalog, kategori, marka, etiket, ürün; sonra gerekirse vergi (vergi tablosu
//   kurulmamışsa okuma onu kurar). Katalog kurulu mu sorusu bu kilitler alındıktan sonra sorulur: arada
//   panelden açılan bir kategori, marka, etiket ya da ürün kataloğa karışmaz (kart 0084 kontrolü). Hiçbir
//   iş ürün kilidinden sonra kategori ya da grup kilidini, vergi kilidinden sonra ötekileri almaz.
import { sql } from "drizzle-orm";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { etiketler } from "../etiket/model.ts";
import { etiketServisi } from "../etiket/servis.ts";
import { siteninFiyatServisi } from "../fiyat/servis.ts";
import { kategoriler } from "../kategori/model.ts";
import { kategoriEkle, kategoriKilidiAl } from "../kategori/servis.ts";
import { markalar } from "../marka/model.ts";
import { markaServisi } from "../marka/servis.ts";
import { stokServisi } from "../stok/servis.ts";
import { siteninVergiServisi } from "../vergi/servis.ts";
import type { KatalogBaslangici } from "./baslangic-semasi.ts";
import { urunKilidiAl } from "./kilit.ts";
import { urunler } from "./model.ts";
import { siteninUrunServisi } from "./servis.ts";

export const baslangicKatalogYazari = sistemIslemi("baslangic-katalog");

const kilitle = (islem: VeritabaniIslemi) =>
  islem.execute(sql`select pg_advisory_xact_lock(hashtext('katalog-baslangic'))`);

const bosKatalogMu = (katalog: KatalogBaslangici) =>
  katalog.kategoriler.length === 0 &&
  katalog.markalar.length === 0 &&
  katalog.etiketler.length === 0 &&
  katalog.urunler.length === 0;

// Silinmiş satır da sayılır: mağaza sahibi her şeyi silse de katalog yeniden yazılmaz.
const kuruluMu = async (islem: VeritabaniIslemi) => {
  for (const tablo of [urunler, kategoriler, markalar, etiketler]) {
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

// Katalog yazıldıysa true. Dosya boşsa ya da katalog zaten kurulmuşsa hiçbir şey yazılmaz.
export const katalogBaslangiciniKur = async (vt: Veritabani, site: Site): Promise<boolean> => {
  const katalog = site.katalogBaslangici;
  if (bosKatalogMu(katalog)) return false;
  const kim = baslangicKatalogYazari;
  const urunServisi = siteninUrunServisi(site);
  const fiyatServisi = siteninFiyatServisi(site);
  const stok = stokServisi();
  return vt.transaction(async (islem) => {
    await kilitle(islem);
    await kategoriKilidiAl(islem);
    await markaServisi.kilidiAl(islem);
    await etiketServisi.kilidiAl(islem);
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

    // İlgili ürünler bütün ürünler yazıldıktan sonra bağlanır: dosyada sonra gelen ürün de seçilebilir.
    const urunKimlikleri = new Map<string, string>();
    for (const urun of katalog.urunler) {
      const {
        fiyat,
        stok: miktar,
        ilgiliUrunler,
        vergiSinifi,
        kategoriler,
        etiketler,
        marka,
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
      });
      urunKimlikleri.set(urun.adresAdi, kimlik);
      const birim = (await urunServisi.urunuOku(islem, kimlik))?.birimler[0]?.kimlik;
      if (birim === undefined) throw new Error(`${urun.adresAdi} ürününün birimi okunamadı.`);
      if (fiyat !== undefined) await fiyatServisi.fiyatYaz(islem, kim, birim, fiyat);
      if (miktar !== undefined && miktar > 0) {
        await stok.stokDuzelt(islem, kim, birim, {
          gorulenMiktar: 0,
          yeniMiktar: miktar,
          sebep: "yeni-mal",
        });
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
