// E-posta girdisinin şeması (kart 0032, karar 0050).
import { z } from "zod";
import { epostaSablonlari } from "../../kayitlar/eposta.ts";
import { epostaMetinBirimKodlari, epostaMetinSinirlari } from "./metin-birimleri.ts";

export const epostaGirdisi = z.strictObject({
  kime: z.email().max(254),
  sablon: z.enum(epostaSablonlari),
  degiskenler: z.record(z.string(), z.string()).default({}),
  // Sipariş e-postasının olay anındaki verisi (kart 0240, karar 0153); gönderilince silinir.
  veri: z.record(z.string(), z.unknown()).optional(),
  // Olayın kalıcı kaydına bağlı anahtar: aynı anahtarla ikinci e-posta yazılmaz.
  olayAnahtari: z.string().min(1).max(200).optional(),
  // Kayıtlı metinler yerine bunlar (panelin deneme e-postası, kart 0279): verilmezse şablonun o anki kayıtlı metinleri
  // okunur.
  metinler: z.record(z.string(), z.unknown()).optional(),
});
export type EpostaGirdisi = z.input<typeof epostaGirdisi>;

// Panelin e-posta metinleri uçları (kart 0279, karar 0197). Metinler köşeli parantezli bilgilerle yazı olarak gelir;
// kurallar (zorunluluk, sınır, bilinmeyen bilgi) serviste uygulanır, hata alanın adı ve koduyla döner. Burada yalnız
// biçim ve üst sınır vardır (kapı şemanın kendi kodunu taşımaz, kart 0285).
const birimKodu = z.enum(epostaMetinBirimKodlari as [string, ...string[]]);
const metinler = {
  kod: birimKodu,
  konu: z.string().max(epostaMetinSinirlari.konu * 2),
  giris: z.string().max(epostaMetinSinirlari.giris * 2),
  kapanis: z.string().max(epostaMetinSinirlari.kapanis * 2),
};
export const epostaOnizlemeSemasi = z.strictObject(metinler);
export const epostaMetniSemasi = z.strictObject({
  ...metinler,
  surum: z.int().min(0).max(2_147_483_647),
});
export const epostaVarsayilaniSemasi = z.strictObject({
  kod: birimKodu,
  surum: z.int().min(0).max(2_147_483_647),
});
export const epostaGondereniSemasi = z.strictObject({
  gonderenAdi: z.string().max(200),
  yanitAdresi: z.string().max(320),
  altBilgiEki: z.string().max(1000),
});
