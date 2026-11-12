// Ürün sayfasının verisi (kart 0138, karar 0108). Sayfada görünen her bilgi çekirdeğin tek işlevinden gelir,
// burada ikinci bir hesap yapılmaz:
//
// - Ürün ürün servisinin urunuOku'suyla; sayfanın açılıp açılmadığı (taslak, arşiv, silinmiş, zamanı gelmemiş)
//   adresin çözümündedir (kayitAdresiniCoz), bu işlev açılan ürünün kimliğiyle çağrılır.
// - Her birleşimin fiyatı gosterilecekFiyatlar ile, fiyat bileşeninin biçimine araliginiKur ile (tek adaylı
//   aralık: rozet ve indirim bitişi kartla aynı kuraldan). Ürünün seçimsiz fiyatı fiyatAraliklari ile.
// - Stok yazısı stokDurumu ile (birim) ve urunStokDurumu ile (seçimsiz ürün). Birleşim satılabilirse ve fiyatı
//   varsa müşteri onu seçebilir. Fiyatı olmayan birim satın alınamaz (karar 0071): kendi yazısı "tükendi"dir ve
//   ürünün genel durumuna sayılmaz.
// - Birleşimin görseli birimGorseli ile; adresler ürün görseli ucundan, boyutları kayıttandır (karar 0073).
// - Özellik tablosu ürünün değerlerinden, özelliklerin sırasıyla (urununOzellikleri); değer sitenin
//   biçimleyicisiyle yazılır.
// - Uzun açıklama aciklamayiTemizle'den geçer.
// - İlgili ürünler ilgiliUrunleriGetir ile, kartları urunKartlari ile.
import { and, inArray, isNull } from "drizzle-orm";
import type { Site } from "../../ayar-semasi/site-klasoru";
import { type GorselBoyutu, gorselBoyutAdlari } from "../../kayitlar/gorsel";
import type { SecenekOnSecimi, TukenmisSecenekGosterimi } from "../../kayitlar/urun";
import { adresAdiUret } from "../../metinler/adres-adi";
import { metinOkuyucu } from "../../metinler/metin";
import { siteninBicimleyicisi } from "../../metinler/site-metni";
import { type FiyatAraligi, fiyatGosterimServisi } from "../../moduller/fiyat/gosterim";
import { kategoriler } from "../../moduller/kategori/model";
import { siteninMagazaAyarlari } from "../../moduller/magaza-ayarlari/servis";
import { markalar } from "../../moduller/marka/model";
import { urununOzellikleri } from "../../moduller/ozellik/degerler";
import { ozellikServisi } from "../../moduller/ozellik/servis";
import { type StokDurumu, stokDurumlari, urunStokDurumu } from "../../moduller/stok/durum";
import { aciklamayiTemizle } from "../../moduller/urun/aciklama";
import { birimGorseli, type GaleriOgesi } from "../../moduller/urun/galeri";
import { ilgiliUrunleriGetir } from "../../moduller/urun/ilgili";
import { siteninUrunServisi } from "../../moduller/urun/servis";
import { urunGorseliAdresi } from "../../moduller/urun/urun-gorseli";
import type { Veritabani } from "../../veritabani/baglanti";
import { kayitAdresleri } from "../adresler";
import type { UrunKartiVerisi } from "../urun-karti/tur";
import { urunKartlari } from "../urun-karti/veri";
import { type SecimBirimi, type SecimSecenegi, tekilAnahtarlar } from "./secim";

// Galerinin görsel öğesi: adresler küçükten büyüğe (srcset), genişlik ve yükseklik en büyük boyutundandır.
export type SayfaGorseli = {
  tur: "gorsel";
  kimlik: string;
  alternatifMetin: string;
  kaynaklar: { adres: string; genislik: number }[];
  // Küçük görselin adresi (galerinin küçük görselleri).
  kucuk: string;
  genislik: number;
  yukseklik: number;
};
export type SayfaVideosu = {
  tur: "video";
  kimlik: string;
  alternatifMetin: string;
  // Çerezsiz oynatıcının adresi (karar 0073); yalnız müşteri oynata basınca yüklenir.
  oynatici: string;
};
export type SayfaGaleriOgesi = SayfaGorseli | SayfaVideosu;

export type StokGosterimiVerisi = StokDurumu["gosterim"];

export type SayfaBirimi = SecimBirimi & {
  stokKodu?: string;
  // Fiyatı olmayan birimde yoktur (satın alınamaz).
  fiyat?: FiyatAraligi;
  stok: StokGosterimiVerisi;
  // Birleşimin görselinin galerideki sırası; görseli olmayan üründe yoktur.
  gorselSirasi?: number;
};

export type UrunSayfasiVerisi = {
  kimlik: string;
  ad: string;
  adresAdi: string;
  kisaAciklama?: string;
  // Temizlenmiş HTML (aciklamayiTemizle).
  uzunAciklama?: string;
  marka?: { ad: string; adres: string };
  // Sayfa yolundaki kategori: ürünün silinmemiş ilk kategorisi.
  kategori?: { ad: string; adres: string };
  galeri: SayfaGaleriOgesi[];
  // Ana görselin galerideki sırası.
  anaGorselSirasi?: number;
  secenekler: SecimSecenegi[];
  birimler: SayfaBirimi[];
  // Seçim tamamlanmamışken: ürünün fiyat aralığı ve genel stok durumu.
  genel: { fiyat?: FiyatAraligi; stok: StokGosterimiVerisi; satilabilir: boolean };
  ozellikler: { ad: string; deger: string }[];
  ilgili: UrunKartiVerisi[];
  // Kargoya verme süresi (iş günü); kargo gerekmeyen üründe yoktur.
  kargoyaVermeSuresi?: number;
  tukenmisSecenek: TukenmisSecenekGosterimi;
  secenekOnSecimi: SecenekOnSecimi;
};

const okunurAnahtar = (ad: string): string => adresAdiUret(ad) || ad.trim();

const sayfaGorseli = (oge: Extract<GaleriOgesi, { tur: "gorsel" }>): SayfaGorseli | undefined => {
  const boyutlar = gorselBoyutAdlari.flatMap((boyut: GorselBoyutu) => {
    const dosya = oge.boyutlar[boyut];
    return dosya === undefined ? [] : [{ boyut, dosya }];
  });
  const [enKucuk] = boyutlar;
  const enBuyuk = boyutlar.at(-1);
  if (enKucuk === undefined || enBuyuk === undefined) return undefined;
  return {
    tur: "gorsel",
    kimlik: oge.kimlik,
    alternatifMetin: oge.alternatifMetin,
    kaynaklar: boyutlar.map(({ boyut, dosya }) => ({
      adres: urunGorseliAdresi(oge.kimlik, boyut),
      genislik: dosya.genislik,
    })),
    kucuk: urunGorseliAdresi(oge.kimlik, enKucuk.boyut),
    genislik: enBuyuk.dosya.genislik,
    yukseklik: enBuyuk.dosya.yukseklik,
  };
};

// Özelliğin değerinin sitenin dilinde yazılışı.
const ozellikDegeriYazisi = (
  ozellik: Awaited<ReturnType<typeof ozellikServisi.hepsiniOku>>[number],
  deger: string | number | boolean,
  site: Site,
): string | undefined => {
  const metin = metinOkuyucu(site.ayarlar.dil);
  switch (ozellik.tur) {
    case "metin":
      return String(deger);
    case "evet-hayir":
      return metin(deger === true ? "vitrin.liste.evet" : "vitrin.liste.hayir");
    case "sayi": {
      const sayi = Number(deger);
      const ondalik = (String(deger).split(".")[1] ?? "").replace(/0+$/, "").length;
      const yazili = siteninBicimleyicisi(site.ayarlar).sayi(sayi, ondalik);
      return ozellik.birim === undefined ? yazili : `${yazili} ${ozellik.birim}`;
    }
    case "liste":
      return ozellik.secenekler.find((secenek) => secenek.kimlik === deger)?.ad;
  }
};

export const urunSayfasiVerisi = async (
  vt: Veritabani,
  site: Site,
  kimlik: string,
  { an = new Date() }: { an?: Date } = {},
): Promise<UrunSayfasiVerisi | undefined> => {
  const urun = await siteninUrunServisi(site).urunuOku(vt, kimlik);
  if (urun === undefined || urun.silindi) return undefined;
  const ayarlar = await siteninMagazaAyarlari(vt, site);
  const gosterim = fiyatGosterimServisi(site);

  const birimler = urun.birimler.filter((birim) => !birim.silindi);
  const birimKimlikleri = birimler.map((birim) => birim.kimlik);
  const [fiyatlar, stoklar, araliklar, ozellikDegerleri, tanimlar, ilgiliKimlikleri] =
    await Promise.all([
      gosterim.gosterilecekFiyatlar(vt, birimKimlikleri, { an }),
      stokDurumlari(vt, birimKimlikleri, ayarlar),
      gosterim.fiyatAraliklari(vt, [urun.kimlik], { an }),
      urununOzellikleri(vt, urun.kimlik),
      ozellikServisi.hepsiniOku(vt),
      ilgiliUrunleriGetir(vt, urun.kimlik, { an, tukenenUrun: ayarlar.tukenenUrun }),
    ]);
  const [kategoriSatirlari, markaSatirlari, ilgili] = await Promise.all([
    urun.kategoriler.length === 0
      ? []
      : vt
          .select({
            kimlik: kategoriler.kimlik,
            ad: kategoriler.ad,
            adresAdi: kategoriler.adres_adi,
          })
          .from(kategoriler)
          .where(
            and(inArray(kategoriler.kimlik, urun.kategoriler), isNull(kategoriler.silinme_zamani)),
          ),
    urun.marka === null
      ? []
      : vt
          .select({ ad: markalar.ad, adresAdi: markalar.adres_adi })
          .from(markalar)
          .where(and(inArray(markalar.kimlik, [urun.marka]), isNull(markalar.silinme_zamani))),
    urunKartlari(vt, site, ilgiliKimlikleri, { yer: "liste", an }),
  ]);

  // Galeri: boyutu hiç olmayan görsel gösterilemez, atlanır.
  const galeri = urun.galeri.flatMap((oge): SayfaGaleriOgesi[] => {
    if (oge.tur === "video") {
      return [
        {
          tur: "video",
          kimlik: oge.kimlik,
          alternatifMetin: oge.alternatifMetin,
          oynatici: oge.oynatici,
        },
      ];
    }
    const gorsel = sayfaGorseli(oge);
    return gorsel === undefined ? [] : [gorsel];
  });
  const galeriSirasi = (oge: string | undefined): number | undefined => {
    const sira = galeri.findIndex((aday) => aday.kimlik === oge);
    return sira === -1 ? undefined : sira;
  };

  // Seçenekler: yalnız silinmemiş ve en az bir silinmemiş birleşimde geçen değerler, ürünün sırasıyla.
  const kullanilan = new Set(birimler.flatMap((birim) => birim.degerler));
  const secenekler = urun.secenekler
    .filter((secenek) => !secenek.silindi)
    .map((secenek) => {
      const degerler = secenek.degerler.filter(
        (deger) => !deger.silindi && kullanilan.has(deger.kimlik),
      );
      const anahtarlar = tekilAnahtarlar(degerler.map((deger) => okunurAnahtar(deger.ad)));
      return {
        kimlik: secenek.kimlik,
        ad: secenek.ad,
        degerler: degerler.map((deger, i) => ({
          kimlik: deger.kimlik,
          ad: deger.ad,
          anahtar: anahtarlar[i] ?? deger.kimlik,
        })),
      };
    });
  const secenekAnahtarlari = tekilAnahtarlar(
    secenekler.map((secenek) => okunurAnahtar(secenek.ad)),
  );

  const sayfaBirimleri = birimler.map((birim): SayfaBirimi => {
    const fiyat = fiyatlar.get(birim.kimlik);
    const aralik = fiyat === undefined ? undefined : gosterim.araliginiKur([fiyat]);
    const stok = stoklar.get(birim.kimlik);
    const gorselSirasi = galeriSirasi(birimGorseli(urun, birim.kimlik)?.kimlik);
    return {
      kimlik: birim.kimlik,
      degerler: birim.degerler,
      satilabilir: stok?.satilabilir === true && aralik !== undefined,
      // Fiyatı olmayan birim satın alınamaz (karar 0071): stoğu olsa da tükenmiş yazılır.
      stok: aralik === undefined ? { tur: "tukendi" } : (stok?.gosterim ?? { tur: "tukendi" }),
      ...(birim.stokKodu === undefined ? {} : { stokKodu: birim.stokKodu }),
      ...(aralik === undefined ? {} : { fiyat: aralik }),
      ...(gorselSirasi === undefined ? {} : { gorselSirasi }),
    };
  });
  // Ürünün genel durumu yalnız fiyatı olan birimlerden: fiyatsız birim satılabilir sayılmaz (fiyat aralığıyla
  // aynı kural).
  const genelStok = urunStokDurumu(
    birimKimlikleri.flatMap((birim) => {
      const durum = stoklar.get(birim);
      return durum === undefined || !fiyatlar.has(birim) ? [] : [durum];
    }),
  );
  const genelFiyat = araliklar.get(urun.kimlik);

  const tanimHaritasi = new Map(tanimlar.map((tanim) => [tanim.kimlik, tanim]));
  const ozellikSatirlari = ozellikDegerleri.flatMap(({ ozellik, deger }) => {
    const tanim = tanimHaritasi.get(ozellik);
    const yazili = tanim === undefined ? undefined : ozellikDegeriYazisi(tanim, deger, site);
    return tanim === undefined || yazili === undefined ? [] : [{ ad: tanim.ad, deger: yazili }];
  });

  const kategori = urun.kategoriler
    .map((kimlik) => kategoriSatirlari.find((satir) => satir.kimlik === kimlik))
    .find((satir) => satir !== undefined);
  const [marka] = markaSatirlari;
  const anaGorselSirasi = galeriSirasi(galeri.find((oge) => oge.tur === "gorsel")?.kimlik);
  const uzunAciklama = aciklamayiTemizle(urun.uzunAciklama);
  const kisaAciklama = urun.kisaAciklama?.trim();

  return {
    kimlik: urun.kimlik,
    ad: urun.ad,
    adresAdi: urun.adresAdi,
    ...(kisaAciklama === undefined || kisaAciklama === "" ? {} : { kisaAciklama }),
    ...(uzunAciklama === undefined ? {} : { uzunAciklama }),
    ...(marka === undefined
      ? {}
      : { marka: { ad: marka.ad, adres: kayitAdresleri.marka(marka.adresAdi) } }),
    ...(kategori === undefined
      ? {}
      : { kategori: { ad: kategori.ad, adres: kayitAdresleri.kategori(kategori.adresAdi) } }),
    galeri,
    ...(anaGorselSirasi === undefined ? {} : { anaGorselSirasi }),
    secenekler: secenekler.map((secenek, i) => ({
      ...secenek,
      anahtar: secenekAnahtarlari[i] ?? secenek.kimlik,
    })),
    birimler: sayfaBirimleri,
    genel: {
      ...(genelFiyat === undefined ? {} : { fiyat: genelFiyat }),
      stok: genelStok.gosterim,
      satilabilir: sayfaBirimleri.some((birim) => birim.satilabilir),
    },
    ozellikler: ozellikSatirlari,
    ilgili,
    ...(urun.kargoGerekmez ? {} : { kargoyaVermeSuresi: ayarlar.kargoyaVermeSuresi }),
    tukenmisSecenek: ayarlar.tukenmisSecenek,
    secenekOnSecimi: ayarlar.secenekOnSecimi,
  };
};
