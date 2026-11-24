// Blog ekranlarının verisi (kart 0272, karar 0176), sunucuda: listenin bir sayfası biçimlenmiş satırlarla, kategori
// süzgecinin seçenekleri, yazının formu ve blog kategorileri. Liste ucu ve sayfa aynı işlevleri çağırır.
import { and, eq } from "drizzle-orm";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import type { BlogYaziDurumu } from "../../kayitlar/blog";
import { dosyaSinirlari, yuklenebilenTurAdlari } from "../../kayitlar/dosya";
import { yerelZamana } from "../../metinler/bicimleyici";
import { siteninBicimleyicisi } from "../../metinler/site-metni";
import { gorselBoyutlariniOku } from "../../moduller/dosya/servis";
import { blogYazilari } from "../../moduller/icerik/model";
import { blogPanelListesi } from "../../moduller/icerik/panel-listesi";
import {
  blogKategorileriniOku,
  blogKategoriYaziSayilari,
  blogYazisiOku,
} from "../../moduller/icerik/servis";
import { blogYazisiVitrinde } from "../../moduller/icerik/vitrin";
import { siteninMagazaAyarlari } from "../../moduller/magaza-ayarlari/servis";
import { siteninVeritabani } from "../../veritabani/baglanti";
import type { ListeDurumu, ListeVerisi } from "../liste/tanim";
import type { KayitSecenegi } from "../urunler/veri";
import { blogListesiGirdisi } from "./liste-tanimi";
import type { BlogYazisiEkraniVerisi } from "./yazi-ekrani";

export type BlogSatiri = {
  kimlik: string;
  baslik: string;
  adresAdi: string;
  durum: BlogYaziDurumu;
  // Yayın zamanı sitenin biçimiyle (taslakta yok).
  yayinZamani: string | null;
  // Kapağın dosya kimliği (panel önizlemesi); yoksa ya da görme izni yoksa yok.
  kapak?: string;
  kategori: string | null;
};

export const blogListesiVerisi = async (
  durum: ListeDurumu,
  { gorselGorur }: { gorselGorur: boolean },
): Promise<ListeVerisi<BlogSatiri>> => {
  const site = calisanSite();
  const vt = siteninVeritabani();
  const b = siteninBicimleyicisi(site.ayarlar);
  const { panelSayfaBoyu } = await siteninMagazaAyarlari(vt, site);
  const liste = await blogPanelListesi(vt, blogListesiGirdisi(durum, panelSayfaBoyu), {
    dil: site.ayarlar.dil,
  });
  return {
    satirlar: liste.satirlar.map((satir) => ({
      kimlik: satir.kimlik,
      baslik: satir.baslik,
      adresAdi: satir.adresAdi,
      durum: satir.durum,
      // Yayındaki yazının günü (taslağın biçimi), zamanlanmış yazının günü ve saati.
      yayinZamani:
        satir.durum === "taslak" || satir.yayinZamani === null
          ? null
          : satir.durum === "zamanlanmis"
            ? b.tarihSaat(satir.yayinZamani)
            : b.uzunTarih(satir.yayinZamani),
      ...(gorselGorur && satir.kapak !== null ? { kapak: satir.kapak } : {}),
      kategori: satir.kategori?.ad ?? null,
    })),
    toplam: liste.toplam,
    sayfa: liste.sayfa,
    sayfaSayisi: liste.sayfaSayisi,
    sayfaBoyu: liste.sayfaBoyu,
    sekmeSayilari: {
      ...liste.durumSayilari,
      "": Object.values(liste.durumSayilari).reduce((a, sayi) => a + sayi, 0),
    },
  };
};

// Kategori süzgecinin seçenekleri: silinmemiş blog kategorileri, sırasıyla.
export const blogSuzgecSecenekleri = async (): Promise<Record<string, KayitSecenegi[]>> => ({
  kategori: (await blogKategorileriniOku(siteninVeritabani())).map((k) => ({
    deger: k.kimlik,
    ad: k.ad,
  })),
});

export type BlogKategoriSatiri = {
  kimlik: string;
  ad: string;
  adresAdi: string;
  yaziSayisi: number;
};

export const blogKategorileriVerisi = async (): Promise<BlogKategoriSatiri[]> => {
  const vt = siteninVeritabani();
  const [kategoriler, sayilar] = await Promise.all([
    blogKategorileriniOku(vt),
    blogKategoriYaziSayilari(vt),
  ]);
  return kategoriler.map((k) => ({
    kimlik: k.kimlik,
    ad: k.ad,
    adresAdi: k.adresAdi,
    yaziSayisi: sayilar.get(k.kimlik) ?? 0,
  }));
};

// Yazının formu: alanlar formun yazılışıyla (yayın zamanı sitenin saat diliminde yerel zaman), kapağın ölçüsü
// (önizleme), vitrinde görünüp görünmediği ve görülen değişme anı (çakışma denetimi).
export type BlogYazisiFormVerisi = {
  kimlik: string;
  gorulen: string;
  vitrinde: boolean;
  // Yayındaki ya da zamanı gelmiş yazının yayın anı, sitenin biçimiyle.
  yayinYazisi: string | null;
  form: BlogYazisiFormu;
  kapakOlcusu: { genislik: number; yukseklik: number } | null;
};

export type BlogYazisiFormu = {
  baslik: string;
  adresAdi: string;
  ozet: string;
  icerik: string;
  kapak: { dosya: string; metin: string } | null;
  kategori: string;
  yazar: string;
  durum: BlogYaziDurumu;
  yayinZamani: string;
};

export const bosBlogYazisiFormu: BlogYazisiFormu = {
  baslik: "",
  adresAdi: "",
  ozet: "",
  icerik: "",
  kapak: null,
  kategori: "",
  yazar: "",
  durum: "taslak",
  yayinZamani: "",
};

export const blogYazisiFormVerisi = async (
  kimlik: string,
): Promise<BlogYazisiFormVerisi | null> => {
  const site = calisanSite();
  const vt = siteninVeritabani();
  const yazi = await blogYazisiOku(vt, kimlik);
  if (yazi === null) return null;
  const b = siteninBicimleyicisi(site.ayarlar);
  const [vitrinde, boyutlar] = await Promise.all([
    vt
      .select({ kimlik: blogYazilari.kimlik })
      .from(blogYazilari)
      .where(and(eq(blogYazilari.kimlik, yazi.kimlik), blogYazisiVitrinde()))
      .then((satirlar) => satirlar.length > 0),
    yazi.kapak === null ? Promise.resolve(new Map()) : gorselBoyutlariniOku(vt, [yazi.kapak.dosya]),
  ]);
  const olcu = yazi.kapak === null ? undefined : boyutlar.get(yazi.kapak.dosya)?.tam;
  return {
    kimlik: yazi.kimlik,
    gorulen: yazi.guncellenmeZamani.toISOString(),
    vitrinde,
    yayinYazisi:
      yazi.durum !== "taslak" && yazi.yayinZamani !== null ? b.tarihSaat(yazi.yayinZamani) : null,
    form: {
      baslik: yazi.baslik,
      adresAdi: yazi.adresAdi,
      ozet: yazi.ozet ?? "",
      icerik: yazi.icerik,
      kapak: yazi.kapak,
      kategori: yazi.kategori ?? "",
      yazar: yazi.yazar ?? "",
      durum: yazi.durum,
      yayinZamani:
        yazi.durum === "zamanlanmis" && yazi.yayinZamani !== null
          ? yerelZamana(yazi.yayinZamani, site.ayarlar.saatDilimi)
          : "",
    },
    kapakOlcusu: olcu === undefined ? null : { genislik: olcu.genislik, yukseklik: olcu.yukseklik },
  };
};

// Yazı ekranının verisi: yeni yazıda boş form; var olan yazıda formu, yoksa (silinmiş ya da olmayan) undefined.
export const blogYazisiEkraniVerisi = async (
  kimlik: string | undefined,
  yetkili: (izin: "icerik.degistir" | "icerik.sil" | "dosya.gor") => boolean,
): Promise<BlogYazisiEkraniVerisi | undefined> => {
  const site = calisanSite();
  const bicim = siteninBicimleyicisi(site.ayarlar);
  const ortak = {
    kategoriler: (await blogKategorileriniOku(siteninVeritabani())).map((k) => ({
      kimlik: k.kimlik,
      ad: k.ad,
    })),
    izinler: {
      degistir: yetkili("icerik.degistir"),
      sil: yetkili("icerik.sil"),
      gorselGor: yetkili("dosya.gor"),
    },
    enCokDosyaBoyutu: bicim.dosyaBoyutu(dosyaSinirlari.enCokBayt),
    dosyaTurleri: bicim.veyaListesi(yuklenebilenTurAdlari),
  };
  if (kimlik === undefined) {
    return { ...ortak, form: bosBlogYazisiFormu, yayinYazisi: null, kapakOlcusu: null };
  }
  const yazi = await blogYazisiFormVerisi(kimlik);
  if (yazi === null) return undefined;
  return {
    ...ortak,
    kimlik: yazi.kimlik,
    gorulen: yazi.gorulen,
    form: yazi.form,
    yayinYazisi: yazi.yayinYazisi,
    kapakOlcusu: yazi.kapakOlcusu,
  };
};
