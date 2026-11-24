// Sitenin başlangıç blogunun şeması (baslangic/blog.json, kart 0272, karar 0176). Site doğrulaması dosyayı bununla okur;
// kurulum (baslangic.ts) yalnız sitede hiç blog satırı yokken bir kez yazar.
//
// - Kategoriler sırasıyla yazılır; yazının kategorisi kategorinin adres adıdır, dosyada olmalı.
// - Kapak görseli baslangic/gorseller/ klasöründeki dosyanın adıdır (katalogla aynı kalıp).
// - Yayında ve zamanlanmış yazının zamanı sitenin saat diliminde yerel zamandır; taslağın zamanı yoktur.
// - İçerik biçimli metindir (HTML); vitrin yazarken temizler.
import { z } from "zod";
import { blogSinirlari, blogYaziDurumlari } from "../../kayitlar/blog.ts";
import { adresAdiKalibi, adresAdiUzunlugu } from "../../metinler/adres-adi.ts";
import { katalogGorselAdi } from "../urun/baslangic-semasi.ts";

const adresAdi = z.string().max(adresAdiUzunlugu).regex(adresAdiKalibi);
const metin = (enCok: number) => z.string().trim().min(1).max(enCok);

export const blogBaslangicSemasi = z.strictObject({
  kategoriler: z
    .array(z.strictObject({ ad: metin(blogSinirlari.kategoriAdi), adresAdi }))
    .max(blogSinirlari.kategoriSayisi)
    .default([]),
  yazilar: z
    .array(
      z.strictObject({
        baslik: metin(blogSinirlari.baslik),
        adresAdi,
        ozet: metin(blogSinirlari.ozet).optional(),
        icerik: z.string().max(blogSinirlari.icerik).default(""),
        kapak: z
          .strictObject({
            gorsel: katalogGorselAdi,
            metin: metin(blogSinirlari.kapakMetni),
          })
          .optional(),
        kategori: adresAdi.optional(),
        yazar: metin(blogSinirlari.yazar).optional(),
        durum: z.enum(blogYaziDurumlari),
        yayinZamani: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
          .optional(),
      }),
    )
    .default([]),
});
export type BlogBaslangici = z.output<typeof blogBaslangicSemasi>;

export const bosBlogBaslangici: BlogBaslangici = { kategoriler: [], yazilar: [] };

// Alanlar arası kurallar: adres adlarının tekilliği, kategorinin dosyada olması, taslak dışında yayın zamanı.
export const blogBaslangicKurallari = (blog: BlogBaslangici): string[] => {
  const sorunlar: string[] = [];
  const kategoriAdresleri = new Set<string>();
  for (const [sira, kategori] of blog.kategoriler.entries()) {
    if (kategoriAdresleri.has(kategori.adresAdi)) {
      sorunlar.push(`kategoriler.${sira}.adresAdi: aynı adres adıyla iki kategori`);
    }
    kategoriAdresleri.add(kategori.adresAdi);
  }
  const yaziAdresleri = new Set<string>();
  for (const [sira, yazi] of blog.yazilar.entries()) {
    if (yaziAdresleri.has(yazi.adresAdi)) {
      sorunlar.push(`yazilar.${sira}.adresAdi: aynı adres adıyla iki yazı`);
    }
    yaziAdresleri.add(yazi.adresAdi);
    if (yazi.kategori !== undefined && !kategoriAdresleri.has(yazi.kategori)) {
      sorunlar.push(`yazilar.${sira}.kategori: dosyada bu adres adıyla kategori yok`);
    }
    if (yazi.durum !== "taslak" && yazi.yayinZamani === undefined) {
      sorunlar.push(`yazilar.${sira}.yayinZamani: yayında ve zamanlanmış yazının zamanı olur`);
    }
  }
  return sorunlar;
};

export const blogGorselAdlari = (blog: BlogBaslangici): Set<string> =>
  new Set(blog.yazilar.flatMap((yazi) => (yazi.kapak === undefined ? [] : [yazi.kapak.gorsel])));
