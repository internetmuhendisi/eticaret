// Sitenin başlangıç blogunu (baslangic/blog.json, kart 0272, karar 0176) bir kez yazar.
//
// - Ne zaman: arka plan süreci açılırken, düzenden sonra (arka-plan-isleri/baslangic.ts). Sitede hiç blog satırı (yazı
//   ya da kategori, silinmiş bile olsa) yoksa yazılır. Sonra dosya kullanılmaz: mağaza sahibinin sildiği yazı geri
//   gelmez.
// - Nasıl: kapak görselleri önce kaydedilir (dosya kaydı bir işlemin içinde yapılamaz), sonra kategoriler ve yazılar
//   servisle, tek işlemde; değişiklik kaydında yazan "baslangic-blog" adlı sistem işlemidir. İşlem içeriğin kilidini
//   alır: aynı anda açılan iki süreç blogu iki kez yazmaz. Yazılamazsa kaydedilen görseller silinmiş işaretlenir.
// - Yayındaki yazının ilk yayın anı dosyadaki yerel zamandır (sıra ve tarih ondan gelir).
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri.ts";
import { yerelZamandan } from "../../metinler/bicimleyici.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { dosyaKlasoru } from "../dosya/servis.ts";
import { baslangicGorselleriyle } from "../urun/baslangic.ts";
import { blogGorselAdlari } from "./baslangic-semasi.ts";
import { blogKategorileri, blogYazilari } from "./model.ts";
import { icerikKilidiAl, icerikServisi } from "./servis.ts";

export const baslangicBlogYazari = sistemIslemi("baslangic-blog");

const kuruluMu = async (vt: Veritabani | VeritabaniIslemi) =>
  (await vt.select({ kimlik: blogKategorileri.kimlik }).from(blogKategorileri).limit(1)).length >
    0 || (await vt.select({ kimlik: blogYazilari.kimlik }).from(blogYazilari).limit(1)).length > 0;

// Blog yazıldıysa true; dosya boşsa ya da blog kuruluysa false.
export const blogBaslangiciniKur = async (
  vt: Veritabani,
  site: Site,
  klasor: () => string = dosyaKlasoru,
): Promise<boolean> => {
  const blog = site.blogBaslangici;
  if (blog.kategoriler.length === 0 && blog.yazilar.length === 0) return false;
  // Kurulu blogda görseller boşuna kaydedilmesin. Kesin cevap işlemin içinde, kilitten sonradır.
  if (await kuruluMu(vt)) return false;
  const servis = icerikServisi(() => site.ayarlar.saatDilimi);
  const yaz = (gorseller: ReadonlyMap<string, string>) =>
    vt.transaction(async (islem) => {
      await icerikKilidiAl(islem);
      if (await kuruluMu(islem)) return false;
      const kategoriler = new Map<string, string>();
      for (const kategori of blog.kategoriler) {
        const { kimlik } = await servis.kategoriEkle(islem, baslangicBlogYazari, kategori);
        kategoriler.set(kategori.adresAdi, kimlik);
      }
      for (const yazi of blog.yazilar) {
        const kapak =
          yazi.kapak === undefined
            ? undefined
            : { dosya: gorseller.get(yazi.kapak.gorsel), metin: yazi.kapak.metin };
        if (kapak !== undefined && kapak.dosya === undefined) {
          throw new Error(`Başlangıç blogunun görseli kaydedilmedi: ${yazi.kapak?.gorsel}.`);
        }
        const yayinAni =
          yazi.durum === "yayinda" && yazi.yayinZamani !== undefined
            ? yerelZamandan(yazi.yayinZamani, site.ayarlar.saatDilimi)
            : undefined;
        await servis.yaziEkle(
          islem,
          baslangicBlogYazari,
          {
            baslik: yazi.baslik,
            adresAdi: yazi.adresAdi,
            ...(yazi.ozet === undefined ? {} : { ozet: yazi.ozet }),
            icerik: yazi.icerik,
            ...(kapak === undefined ? {} : { kapak }),
            ...(yazi.kategori === undefined ? {} : { kategori: kategoriler.get(yazi.kategori) }),
            ...(yazi.yazar === undefined ? {} : { yazar: yazi.yazar }),
            durum: yazi.durum,
            ...(yazi.durum === "zamanlanmis" && yazi.yayinZamani !== undefined
              ? { yayinZamani: yazi.yayinZamani }
              : {}),
          },
          yayinAni === undefined ? {} : { yayinAni },
        );
      }
      return true;
    });
  const adlar = blogGorselAdlari(blog);
  if (adlar.size === 0) return yaz(new Map());
  return baslangicGorselleriyle(vt, site, adlar, klasor, yaz);
};
