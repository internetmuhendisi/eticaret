// Panelin müşteri ekranlarının şemaları (kart 0271, karar 0173). Vitrinin müşteri şemalarından (semalar.ts) ayrıdır:
// vitrinin kayıt formu onları tarayıcıya götürür, panelin şemaları vitrine gitmez (karar 0172).
import { z } from "zod";
import { panelSayfaBoylari } from "../../kayitlar/liste.ts";
import {
  musteriKampanyaSecenekleri,
  musteriListesiSiralamalari,
  musteriPanelSinirlari,
  musteriSiparisSecenekleri,
} from "../../kayitlar/musteri-paneli.ts";
import { takvimGunuMu } from "../../metinler/bicimleyici.ts";
import { duzMetinSemasi } from "../../metinler/duz-metin.ts";
import { kimlikSemasi } from "../../veritabani/kimlik.ts";
import { bosIseYok } from "../siparis/havale-bildirimi-semalari.ts";

// Listenin servis girdisi: kayıt günü (sitenin saat dilimiyle, iki uç dahil, boş uç sınırsız), kampanya izni ve
// sipariş süzgeci (iki seçenek birlikte süzmez), ad ya da e-postada arama, sıralama ve sayfa.
export const musteriListesiSemasi = z.strictObject({
  kayit: z
    .strictObject({
      baslangic: z.string().refine(takvimGunuMu).nullable(),
      bitis: z.string().refine(takvimGunuMu).nullable(),
    })
    .refine(
      ({ baslangic, bitis }) =>
        (baslangic !== null || bitis !== null) &&
        (baslangic === null || bitis === null || baslangic <= bitis),
    )
    .optional(),
  kampanya: z.array(z.enum(musteriKampanyaSecenekleri)).min(1).optional(),
  siparis: z.array(z.enum(musteriSiparisSecenekleri)).min(1).optional(),
  ara: z.preprocess(bosIseYok, z.string().trim().max(musteriPanelSinirlari.aramaEnCok).optional()),
  siralama: z.enum(musteriListesiSiralamalari).default(musteriListesiSiralamalari[0]),
  sayfa: z.coerce.number().int().min(1).max(10_000).default(1),
  sayfaBoyu: z.literal(panelSayfaBoylari).default(panelSayfaBoylari[0]),
});
export type MusteriListesiGirdisi = z.output<typeof musteriListesiSemasi>;

// Müşterinin ayrıntısı (kimlikle).
export const musteriKimligiSemasi = z.strictObject({ musteri: kimlikSemasi });

// Not: düz metin, satır sonu korunur; ekran metni olduğu gibi gösterir.
export const musteriNotuSemasi = z.strictObject({
  musteri: kimlikSemasi,
  metin: duzMetinSemasi(musteriPanelSinirlari.notEnCok),
});
export type MusteriNotuGirdisi = z.output<typeof musteriNotuSemasi>;

export const musteriNotuSilSemasi = z.strictObject({ musteri: kimlikSemasi, not: kimlikSemasi });
export type MusteriNotuSilGirdisi = z.output<typeof musteriNotuSilSemasi>;
