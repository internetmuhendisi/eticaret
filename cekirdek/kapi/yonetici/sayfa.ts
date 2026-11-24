// Sabit sayfa uçları (kart 0273; uç belgesi: cekirdek/kapi/uclar.md). Uç yalnız yönlendirir: kuralların hepsi (adres adı,
// sınır, çakışma) sabit sayfa servisindedir (cekirdek/moduller/icerik/sayfa.ts). Sayfanın alanları uçta nesne olarak
// alınır, servisin şemasıyla doğrulanır (hata alanın adıyla ve koduyla döner). İzinler blogunkilerdir (icerik.*).
import { z } from "zod";
import { type IcerikMenuHedefi, icerikMenuHedefleri } from "../../kayitlar/menu.ts";
import { icerikAra } from "../../moduller/icerik/arama.ts";
import { sabitSayfaServisi } from "../../moduller/icerik/sayfa.ts";
import {
  sabitSayfaDegisikligiSemasi,
  sabitSayfaEklemeSemasi,
  sabitSayfaKimlikSemasi,
} from "../../moduller/icerik/sayfa-semalari.ts";
import { kayitAramaSinirlari } from "../../moduller/urun/kayit-arama.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { ucTanimla } from "../uc.ts";

const yonetici = (hesapKimligi: string) => ({ tur: "yonetici" as const, kimlik: hesapKimligi });

// POST /kapi/yonetici/sayfa-ekle: yeni sayfa; durum verilmezse taslak.
export const sayfaEklemeUcu = ucTanimla({
  giris: "yonetici",
  sema: sabitSayfaEklemeSemasi,
  izin: "icerik.degistir",
  sinir: "genel",
  isle: ({ sayfa }, _istek, _yanit, { hesapKimligi }) =>
    sabitSayfaServisi.sayfaEkle(siteninVeritabani(), yonetici(hesapKimligi), sayfa),
});

// POST /kapi/yonetici/sayfa-degistir: yalnız verilen alan değişir; ekranın gördüğü değişme anı arada değiştiyse çakışma
// (sayfa-degisti). Yanıt sayfanın yeni değişme anıdır.
export const sayfaDegisikligiUcu = ucTanimla({
  giris: "yonetici",
  sema: sabitSayfaDegisikligiSemasi,
  izin: "icerik.degistir",
  sinir: "genel",
  isle: async ({ kimlik, gorulen, sayfa }, _istek, _yanit, { hesapKimligi }) => {
    const sonra = await sabitSayfaServisi.sayfaDegistir(
      siteninVeritabani(),
      yonetici(hesapKimligi),
      kimlik,
      sayfa,
      new Date(gorulen),
    );
    return { gorulen: sonra.guncellenmeZamani.toISOString() };
  },
});

// POST /kapi/yonetici/sayfa-sil: sayfa silinir; eski adresi vitrinde bulunamaz, menüdeki öğesi görünmez.
export const sayfaSilmeUcu = ucTanimla({
  giris: "yonetici",
  sema: sabitSayfaKimlikSemasi,
  izin: "icerik.sil",
  sinir: "genel",
  isle: async ({ kimlik }, _istek, _yanit, { hesapKimligi }) => {
    await sabitSayfaServisi.sayfaSil(siteninVeritabani(), yonetici(hesapKimligi), kimlik);
    return {};
  },
});

export const icerikAramaSemasi = z.strictObject({
  tur: z.enum(icerikMenuHedefleri as unknown as [IcerikMenuHedefi, ...IcerikMenuHedefi[]]),
  ara: z.string().max(kayitAramaSinirlari.aranan).default(""),
  sayfa: z.coerce.number().int().min(0).max(1000).default(0),
});

// GET /kapi/yonetici/icerik-ara?tur=sayfa|blog-yazisi&ara=&sayfa=: menü öğesinin hedefini arayarak seçmek.
export const icerikAramaUcu = ucTanimla({
  giris: "yonetici",
  sema: icerikAramaSemasi,
  izin: "icerik.gor",
  sinir: "genel",
  isle: ({ tur, ara, sayfa }) => icerikAra(siteninVeritabani(), tur, ara, sayfa),
});
