// GET /kapi/yonetici/kayit-ara (kart 0143, uç belgesi: cekirdek/kapi/uclar.md, karar 0116): panelde kategori, marka
// ve ürünü yazdıkça arayarak seçmek. Aranan şey kataloğun adlarıdır: izin ürünleri görmektir (urun.gor).
import { z } from "zod";
import {
  type AranabilirKayit,
  aranabilirKayitlar,
  kayitAra,
  kayitAramaSinirlari,
} from "../../moduller/urun/kayit-arama.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { ucTanimla } from "../uc.ts";

export const kayitAramaSemasi = z.strictObject({
  tur: z.enum(aranabilirKayitlar as unknown as [AranabilirKayit, ...AranabilirKayit[]]),
  ara: z.string().max(kayitAramaSinirlari.aranan).default(""),
  sayfa: z.coerce.number().int().min(0).max(1000).default(0),
});

export const kayitAramaUcu = ucTanimla({
  giris: "yonetici",
  sema: kayitAramaSemasi,
  izin: "urun.gor",
  sinir: "genel",
  isle: async ({ tur, ara, sayfa }) => kayitAra(siteninVeritabani(), tur, ara, sayfa),
});
