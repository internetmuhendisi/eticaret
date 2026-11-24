// Blog uçları (kart 0272, karar 0176; uç belgesi: cekirdek/kapi/uclar.md). Uç yalnız yönlendirir: kuralların hepsi (adres
// adı, kategori, kapak, yayın zamanı, çakışma) içerik servisindedir (cekirdek/moduller/icerik/servis.ts). Yazının ve
// kategorinin alanları uçta nesne olarak alınır, servisin şemasıyla doğrulanır (hata alanın adıyla ve koduyla döner).
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { dosyaGovdesiSemasi } from "../../moduller/dosya/semalar.ts";
import { gorselKaydet } from "../../moduller/dosya/servis.ts";
import { yoneticininIzniVarMi } from "../../moduller/ekip/servis.ts";
import {
  blogAyariSemasi,
  blogKategoriSiralamaSemasi,
  blogKategorisiDegisikligiSemasi,
  blogKategorisiEklemeSemasi,
  blogKimlikSemasi,
  blogYazisiDegisikligiSemasi,
  blogYazisiEklemeSemasi,
} from "../../moduller/icerik/semalar.ts";
import { icerikServisi } from "../../moduller/icerik/servis.ts";
import { siteninServisi } from "../../moduller/magaza-ayarlari/servis.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { blogListesiTanimi } from "../../yonetim-paneli/blog/liste-tanimi.ts";
import { blogListesiVerisi } from "../../yonetim-paneli/blog/veri.ts";
import { listeUcuSemasi } from "../../yonetim-paneli/liste/tanim.ts";
import { ucTanimla } from "../uc.ts";
import { BilinenHata } from "../zarf.ts";

const yonetici = (hesapKimligi: string) => ({ tur: "yonetici" as const, kimlik: hesapKimligi });
const servis = () => icerikServisi(() => calisanSite().ayarlar.saatDilimi);

// GET /kapi/yonetici/blog-yazilari?durum=&kategori=&ara=&sirala=&sayfa=: panelin blog listesinin bir sayfası.
export const blogListesiUcu = ucTanimla({
  giris: "yonetici",
  sema: listeUcuSemasi(blogListesiTanimi),
  izin: "icerik.gor",
  sinir: "genel",
  isle: async (durum, _istek, _yanit, { hesapKimligi }) =>
    blogListesiVerisi(durum, {
      gorselGorur: await yoneticininIzniVarMi(siteninVeritabani(), hesapKimligi, "dosya.gor"),
    }),
});

// POST /kapi/yonetici/blog-yazisi-ekle: yeni yazı; durum verilmezse taslak.
export const blogYazisiEklemeUcu = ucTanimla({
  giris: "yonetici",
  sema: blogYazisiEklemeSemasi,
  izin: "icerik.degistir",
  sinir: "genel",
  isle: ({ yazi }, _istek, _yanit, { hesapKimligi }) =>
    servis().yaziEkle(siteninVeritabani(), yonetici(hesapKimligi), yazi),
});

// POST /kapi/yonetici/blog-yazisi-degistir: yalnız verilen alan değişir; ekranın gördüğü değişme anı arada
// değiştiyse çakışma (yazi-degisti). Yanıt yazının yeni değişme anıdır.
export const blogYazisiDegisikligiUcu = ucTanimla({
  giris: "yonetici",
  sema: blogYazisiDegisikligiSemasi,
  izin: "icerik.degistir",
  sinir: "genel",
  isle: async ({ kimlik, gorulen, yazi }, _istek, _yanit, { hesapKimligi }) => {
    const sonra = await servis().yaziDegistir(
      siteninVeritabani(),
      yonetici(hesapKimligi),
      kimlik,
      yazi,
      new Date(gorulen),
    );
    return { gorulen: sonra.guncellenmeZamani.toISOString() };
  },
});

// POST /kapi/yonetici/blog-yazisi-sil: yazı silinir; eski adresi vitrinde bulunamaz.
export const blogYazisiSilmeUcu = ucTanimla({
  giris: "yonetici",
  sema: blogKimlikSemasi,
  izin: "icerik.sil",
  sinir: "genel",
  isle: async ({ kimlik }, _istek, _yanit, { hesapKimligi }) => {
    await servis().yaziSil(siteninVeritabani(), yonetici(hesapKimligi), kimlik);
    return {};
  },
});

// POST /kapi/yonetici/blog-kapagi-yukle: kapak görselini boyutlarıyla kaydeder; yazıya bağlanması yazının kaydıyladır.
export const blogKapagiYuklemeUcu = ucTanimla({
  giris: "yonetici",
  govde: "dosya",
  sema: dosyaGovdesiSemasi,
  izin: "icerik.degistir",
  sinir: "yukleme",
  isle: async ({ dosya }) => {
    const sonuc = await gorselKaydet(siteninVeritabani(), dosya);
    if (!sonuc.tamam) throw new BilinenHata("dogrulama", [{ alan: "dosya", kod: sonuc.hata }]);
    const { kimlik, genislik, yukseklik } = sonuc.dosya;
    return { dosya: kimlik, genislik, yukseklik };
  },
});

// POST /kapi/yonetici/blog-kategorisi-ekle
export const blogKategorisiEklemeUcu = ucTanimla({
  giris: "yonetici",
  sema: blogKategorisiEklemeSemasi,
  izin: "icerik.degistir",
  sinir: "genel",
  isle: ({ kategori }, _istek, _yanit, { hesapKimligi }) =>
    servis().kategoriEkle(siteninVeritabani(), yonetici(hesapKimligi), kategori),
});

// POST /kapi/yonetici/blog-kategorisi-degistir: ad ve adres adı.
export const blogKategorisiDegisikligiUcu = ucTanimla({
  giris: "yonetici",
  sema: blogKategorisiDegisikligiSemasi,
  izin: "icerik.degistir",
  sinir: "genel",
  isle: async ({ kimlik, kategori }, _istek, _yanit, { hesapKimligi }) => {
    await servis().kategoriDegistir(siteninVeritabani(), yonetici(hesapKimligi), kimlik, kategori);
    return {};
  },
});

// POST /kapi/yonetici/blog-kategorisi-sil: yazıları kategorisiz kalır.
export const blogKategorisiSilmeUcu = ucTanimla({
  giris: "yonetici",
  sema: blogKimlikSemasi,
  izin: "icerik.sil",
  sinir: "genel",
  isle: async ({ kimlik }, _istek, _yanit, { hesapKimligi }) => {
    await servis().kategoriSil(siteninVeritabani(), yonetici(hesapKimligi), kimlik);
    return {};
  },
});

// POST /kapi/yonetici/blog-kategorileri-sirala: bütün kategorilerin yeni sırası.
export const blogKategoriSiralamaUcu = ucTanimla({
  giris: "yonetici",
  sema: blogKategoriSiralamaSemasi,
  izin: "icerik.degistir",
  sinir: "genel",
  isle: async ({ kimlikler }, _istek, _yanit, { hesapKimligi }) => {
    await servis().kategorileriSirala(siteninVeritabani(), yonetici(hesapKimligi), kimlikler);
    return {};
  },
});

// POST /kapi/yonetici/blog-ayari: blogun vitrinde açık olması (mağaza ayarı blogAcik, yalnız bu işlevle değişir).
export const blogAyariUcu = ucTanimla({
  giris: "yonetici",
  sema: blogAyariSemasi,
  izin: "magaza-ayarlari.degistir",
  sinir: "genel",
  isle: async ({ blogAcik }, _istek, _yanit, { hesapKimligi }) => {
    await siteninServisi(calisanSite()).degistir(
      siteninVeritabani(),
      yonetici(hesapKimligi),
      { blogAcik },
      { kendiIslevi: true },
    );
    return {};
  },
});
