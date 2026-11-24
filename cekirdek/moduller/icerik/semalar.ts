// Blog girdisinin şemaları (kart 0272, karar 0176). Panelin ekranı ve uçlar aynı şemayı kullanır. Hata iletileri koddur
// (icerikHatalari); metni ekran çözer.
import { z } from "zod";
import { blogPanelSiralamalari, blogSinirlari, blogYaziDurumlari } from "../../kayitlar/blog.ts";
import { adresAdiKalibi, adresAdiUzunlugu } from "../../metinler/adres-adi.ts";
import { kimlikSemasi } from "../../veritabani/kimlik.ts";
import { kayitMetni } from "../degisiklik-kaydi/deger.ts";

export const icerikHatalari = [
  "kayda-uygun-degil",
  "adres-adi-bicimi",
  "adres-adi-tekrar",
  // Aynı adla iki blog kategorisi (büyük küçük harf ayrımsız).
  "ad-tekrar",
  // Kapak hazır bir görsel değil: dosya yok ya da silinmiş, kendisi bir boyut ya da boyutları eksik.
  "gorsel-gecersiz",
  // Blog kategorisi yok ya da silinmiş.
  "kategori-gecersiz",
  "yayin-zamani-gerekli",
  "yayin-zamani-bicimi",
  // Yerel zaman saat diliminde yaşanmıyor (yaz saati boşluğu).
  "yayin-zamani-gecersiz",
  // Ekranın gördüğü yazı arada değişti: hiçbir şey yazılmaz.
  "yazi-degisti",
  "siralama-gecersiz",
  "kategori-siniri",
] as const;
export type IcerikHatasi = (typeof icerikHatalari)[number];

// Kodların panel metinleri (ekran çözer).
export const icerikHataMetinleri = Object.fromEntries(
  icerikHatalari.map((kod) => [kod, `yonetim.blog.hata.${kod}`]),
) as Record<IcerikHatasi, `yonetim.blog.hata.${IcerikHatasi}`>;
const hata = (kod: IcerikHatasi) => kod;

const adresAdi = z
  .string()
  .trim()
  .max(adresAdiUzunlugu)
  .regex(adresAdiKalibi, hata("adres-adi-bicimi"));

const alanlar = {
  baslik: kayitMetni(blogSinirlari.baslik),
  adresAdi,
  ozet: kayitMetni(blogSinirlari.ozet),
  // Biçimli metin (HTML). Kayda girmez; vitrin yazarken temizler (aciklamayiTemizle). Boş olabilir.
  icerik: z.string().max(blogSinirlari.icerik),
  // Kapak: yüklenmiş görselin dosya kimliği ve alternatif metni birlikte.
  kapak: z.strictObject({ dosya: kimlikSemasi, metin: kayitMetni(blogSinirlari.kapakMetni) }),
  kategori: kimlikSemasi,
  yazar: kayitMetni(blogSinirlari.yazar),
  durum: z.enum(blogYaziDurumlari),
  // Sitenin saat diliminde yerel zaman: "2026-11-08T09:30". Yalnız zamanlanmış yazıda kullanılır.
  yayinZamani: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, hata("yayin-zamani-bicimi")),
};

// Yeni yazı. Verilmeyen adres adı başlıktan üretilir; durum verilmezse taslaktır.
export const blogYazisiGirdisi = z.strictObject({
  baslik: alanlar.baslik,
  adresAdi: alanlar.adresAdi.optional(),
  ozet: alanlar.ozet.optional(),
  icerik: alanlar.icerik.optional(),
  kapak: alanlar.kapak.optional(),
  kategori: alanlar.kategori.optional(),
  yazar: alanlar.yazar.optional(),
  durum: alanlar.durum.default("taslak"),
  yayinZamani: alanlar.yayinZamani.optional(),
});
export type BlogYazisiGirdisi = z.input<typeof blogYazisiGirdisi>;

// Değişiklik: yalnız verilen alan değişir, null isteğe bağlı alanı boşaltır.
export const blogYazisiDegisikligi = z.strictObject({
  baslik: alanlar.baslik.optional(),
  adresAdi: alanlar.adresAdi.optional(),
  ozet: alanlar.ozet.nullable().optional(),
  icerik: alanlar.icerik.optional(),
  kapak: alanlar.kapak.nullable().optional(),
  kategori: alanlar.kategori.nullable().optional(),
  yazar: alanlar.yazar.nullable().optional(),
  durum: alanlar.durum.optional(),
  yayinZamani: alanlar.yayinZamani.nullable().optional(),
});
export type BlogYazisiDegisikligi = z.input<typeof blogYazisiDegisikligi>;

export const blogKategorisiGirdisi = z.strictObject({
  ad: kayitMetni(blogSinirlari.kategoriAdi),
  adresAdi: adresAdi.optional(),
});
export const blogKategorisiDegisikligi = z.strictObject({
  ad: kayitMetni(blogSinirlari.kategoriAdi).optional(),
  adresAdi: adresAdi.optional(),
});

// Uçların zarfı: yazının ve kategorinin alanları servisin şemasıyla doğrulanır (hata alanın adıyla ve kodla döner).
const nesne = z.record(z.string(), z.unknown());
// Ekranın gördüğü yazının son değişme anı (ISO): arada değişmişse yazi-degisti.
export const blogYazisiEklemeSemasi = z.strictObject({ yazi: nesne });
export const blogYazisiDegisikligiSemasi = z.strictObject({
  kimlik: kimlikSemasi,
  gorulen: z.iso.datetime({ offset: true }),
  yazi: nesne,
});
export const blogKimlikSemasi = z.strictObject({ kimlik: kimlikSemasi });
export const blogKategorisiEklemeSemasi = z.strictObject({ kategori: nesne });
export const blogKategorisiDegisikligiSemasi = z.strictObject({
  kimlik: kimlikSemasi,
  kategori: nesne,
});
export const blogKategoriSiralamaSemasi = z.strictObject({
  kimlikler: z.array(kimlikSemasi).max(blogSinirlari.kategoriSayisi),
});
export const blogAyariSemasi = z.strictObject({ blogAcik: z.boolean() });

// Panelin listesi ve sıralamaları liste tanımındadır; sıralama adları kayıttadır.
export const blogPanelSiralamaSemasi = z.enum(blogPanelSiralamalari);
