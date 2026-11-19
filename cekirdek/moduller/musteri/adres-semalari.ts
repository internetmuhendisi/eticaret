// Müşterinin adres defterinin şemaları (kart 0237, karar 0149; .claude/rules/formlar.md). Adreslerim ekranının formu
// ve müşteri uçları aynı şemayı kullanır. Adresin alanları ödeme adımının teslimatıyla aynıdır (teslimat-semasi.ts):
// ad, soyad, telefon ve ortak posta adresi. Telefonun zorunluluğu ve teslimat ülkesi mağaza ayarıdır, servis
// denetler. Bu dosya tarayıcıya gider: yalnız hafif şemaları içe aktarır (.claude/rules/performans.md).
import { z } from "zod";
import {
  musteriAdresiSinirlari,
  varsayilanAdresTurleri,
} from "../../kayitlar/musteri-adresleri.ts";
import { duzMetinSemasi } from "../../metinler/duz-metin.ts";
import { kimlikSemasi } from "../../veritabani/kimlik.ts";
import { type Teslimat, teslimatSemasi } from "../odeme/teslimat-semasi.ts";

// Hata kodları. Kod bir kez yayınlandıktan sonra adı değişmez.
export const adresHatalari = [
  // Adres yok ya da başka müşterinin (ikisi aynı cevabı alır).
  "adres-yok",
  // Müşterinin kayıtlı adres sayısı sınırda.
  "adres-siniri",
] as const;
export type AdresHatasi = (typeof adresHatalari)[number];

// Adres formu: adın, teslimatın alanları ve iki varsayılan işareti.
export const adresFormuSemasi = z.strictObject({
  baslik: duzMetinSemasi(musteriAdresiSinirlari.baslikEnCok),
  teslimat: teslimatSemasi,
  varsayilanTeslimat: z.boolean(),
  varsayilanFatura: z.boolean(),
});
export type AdresFormu = z.output<typeof adresFormuSemasi>;

// GET /kapi/musteri/adresler: girdi almaz, kimlik yalnız kapıdan gelir.
export const adreslerSemasi = z.strictObject({});

// POST /kapi/musteri/adres: yeni adres.
export const adresEkleSemasi = adresFormuSemasi;

// POST /kapi/musteri/adres-degistir: adresin bütün alanları yeniden yazılır.
export const adresDegistirSemasi = adresFormuSemasi.extend({ kimlik: kimlikSemasi });

// POST /kapi/musteri/adres-sil.
export const adresSilSemasi = z.strictObject({ kimlik: kimlikSemasi });

// POST /kapi/musteri/adres-varsayilan: adres verilen türlerde varsayılan olur ("Varsayılan yap").
export const adresVarsayilanSemasi = z.strictObject({
  kimlik: kimlikSemasi,
  turler: z
    .array(z.enum(varsayilanAdresTurleri))
    .min(1)
    .max(varsayilanAdresTurleri.length)
    .refine((turler) => new Set(turler).size === turler.length, { message: "tur-tekrar" }),
});

// Uçların ortak cevabı: müşterinin adresleri, önce varsayılan teslimat adresi, sonra en yeni.
export type KayitliAdres = {
  kimlik: string;
  baslik: string;
  teslimat: Teslimat;
  varsayilanTeslimat: boolean;
  varsayilanFatura: boolean;
};
export type AdresListesi = { adresler: KayitliAdres[] };
