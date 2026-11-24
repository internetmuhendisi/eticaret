// Blog sayfalarının verisi (kart 0272, karar 0176): liste (/blog) ve yazı (/blog/<adres adı>). Blog kapalıysa veri yoktur,
// sayfa "bulunamadı"dır. Yazılar yalnız vitrin koşuluyla (blogYazisiVitrinde) gelir; içerik aciklamayiTemizle ile
// temizlenir. Kapakların adresleri vitrin görseli ucundandır (yalnız vitrinde görünen yazının kapağı açılır).
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { blogSinirlari } from "../../kayitlar/blog.ts";
import { takvimGunu } from "../../metinler/bicimleyici.ts";
import { siteninBicimleyicisi } from "../../metinler/site-metni.ts";
import { gorselBoyutlariniOku } from "../../moduller/dosya/servis.ts";
import {
  type VitrinBlogKarti,
  vitrinBlogKategorileri,
  vitrinBlogYazilari,
  vitrinBlogYazisi,
} from "../../moduller/icerik/vitrin.ts";
import { siteninServisi } from "../../moduller/magaza-ayarlari/servis.ts";
import { aciklamayiTemizle } from "../../moduller/urun/aciklama.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { kayitAdresleri } from "../adresler.ts";
import { baglamGorseli } from "../baglam-oku.ts";
import type { BaglamGorseli } from "../bolum-kutuphanesi/baglam.ts";

export type BlogKartiVerisi = {
  kimlik: string;
  baslik: string;
  adres: string;
  ozet: string | null;
  tarih: { yazili: string; makine: string };
  kapak: { gorsel: BaglamGorseli; metin: string } | null;
  kategori: { ad: string; adresAdi: string } | null;
};

const kartlariKur = async (
  vt: Veritabani,
  site: Site,
  yazilar: readonly VitrinBlogKarti[],
): Promise<BlogKartiVerisi[]> => {
  const bicim = siteninBicimleyicisi(site.ayarlar);
  const boyutlar = await gorselBoyutlariniOku(
    vt,
    yazilar.flatMap((yazi) => (yazi.kapak === null ? [] : [yazi.kapak.dosya])),
  );
  return yazilar.map((yazi) => {
    const dosyaninBoyutlari = yazi.kapak === null ? undefined : boyutlar.get(yazi.kapak.dosya);
    const gorsel =
      yazi.kapak === null || dosyaninBoyutlari === undefined
        ? undefined
        : baglamGorseli(yazi.kapak.dosya, dosyaninBoyutlari);
    return {
      kimlik: yazi.kimlik,
      baslik: yazi.baslik,
      adres: kayitAdresleri["blog-yazisi"](yazi.adresAdi),
      ozet: yazi.ozet,
      tarih: {
        yazili: bicim.uzunTarih(yazi.yayinZamani),
        makine: takvimGunu(yazi.yayinZamani, site.ayarlar.saatDilimi),
      },
      kapak:
        yazi.kapak === null || gorsel === undefined ? null : { gorsel, metin: yazi.kapak.metin },
      kategori: yazi.kategori,
    };
  });
};

export const blogAcikMi = (vt: Veritabani, site: Site): Promise<boolean> =>
  siteninServisi(site).tekOku(vt, "blogAcik");

export type BlogListesiVerisi = {
  yazilar: BlogKartiVerisi[];
  kategoriler: { ad: string; adresAdi: string }[];
  // Adresteki kategori vitrinde yazısı olan bir kategoriyse; yoksa bütün yazılar gösterilir.
  seciliKategori: { ad: string; adresAdi: string } | undefined;
  sayfa: number;
  sayfaSayisi: number;
};

// Blog listesi; blog kapalıysa null.
export const blogListesiVerisi = async (
  vt: Veritabani,
  site: Site,
  girdi: { kategori?: string | undefined; sayfa: number },
): Promise<BlogListesiVerisi | null> => {
  if (!(await blogAcikMi(vt, site))) return null;
  const kategoriler = await vitrinBlogKategorileri(vt);
  const seciliKategori = kategoriler.find((k) => k.adresAdi === girdi.kategori);
  const liste = await vitrinBlogYazilari(vt, {
    kategori: seciliKategori?.adresAdi,
    sayfa: girdi.sayfa,
    boyut: blogSinirlari.vitrinSayfasi,
  });
  return {
    yazilar: await kartlariKur(vt, site, liste.yazilar),
    kategoriler,
    seciliKategori,
    sayfa: liste.sayfa,
    sayfaSayisi: liste.sayfaSayisi,
  };
};

export type BlogYazisiVerisi = BlogKartiVerisi & {
  // Temizlenmiş biçimli metin; boşsa yok.
  icerik: string | undefined;
  // Yazar adı; boşsa mağaza adı (sayfa koyar).
  yazar: string | null;
};

// Yazının sayfası; blog kapalıysa ya da yazı vitrinde değilse null.
export const blogYazisiVerisi = async (
  vt: Veritabani,
  site: Site,
  kimlik: string,
): Promise<BlogYazisiVerisi | null> => {
  if (!(await blogAcikMi(vt, site))) return null;
  const yazi = await vitrinBlogYazisi(vt, kimlik);
  if (yazi === null) return null;
  const [kart] = await kartlariKur(vt, site, [yazi]);
  if (kart === undefined) return null;
  return { ...kart, icerik: aciklamayiTemizle(yazi.icerik), yazar: yazi.yazar };
};
