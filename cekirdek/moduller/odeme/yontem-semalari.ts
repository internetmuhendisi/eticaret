// Ödeme yöntemleri ve banka hesapları ekranının uç şemaları (kart 0214, karar 0141). Form ve uç aynı şemayı kullanır.
// Havalenin iptal süresi yazı olarak gelir (gün): sayı olmayan ya da sınır dışı yazı alanın koduyla döner (servis). IBAN
// yazılışı serviste doğrulanır (cekirdek/bolgeler/iban.ts), hata alanın koduyla döner.
import { z } from "zod";
import {
  bankaHesabiSinirlari,
  kapidaOdemeSecenekleri,
  odemeYontemleri,
} from "../../kayitlar/odeme.ts";
import { kimlikSemasi } from "../../veritabani/kimlik.ts";

export const odemeYontemleriDurumuSemasi = z.strictObject({});

// Liste her yöntemi en çok bir kez taşır: ekran sitede var olan bütün yöntemleri sırasıyla gönderir (eklentisi kapalı
// yöntem sitede yoktur; listenin sitedekilerle aynı olduğunu servis denetler, kart 0215).
export const odemeYontemleriSemasi = z.strictObject({
  yontemler: z
    .array(z.strictObject({ kod: z.enum(odemeYontemleri), acik: z.boolean() }))
    .min(1)
    .max(odemeYontemleri.length)
    .refine(
      (liste) => new Set(liste.map((yontem) => yontem.kod)).size === liste.length,
      "yontem-listesi",
    ),
  kapidaOdemeSecenekleri: z
    .array(z.enum(kapidaOdemeSecenekleri))
    .min(1, "secenek-gerekli")
    .refine((liste) => new Set(liste).size === liste.length, "secenek-tekrari"),
  havaleIptalSuresi: z.string().trim().min(1).max(10),
});
export type OdemeYontemleriGirdisi = z.output<typeof odemeYontemleriSemasi>;

export const bankaHesabiSemasi = z.strictObject({
  banka: z.string().trim().min(1).max(bankaHesabiSinirlari.bankaEnCok),
  sahip: z.string().trim().min(1).max(bankaHesabiSinirlari.sahipEnCok),
  iban: z.string().trim().min(1).max(60),
});
export type BankaHesabiGirdisi = z.output<typeof bankaHesabiSemasi>;

export const bankaHesabiDegisikligiSemasi = bankaHesabiSemasi.extend({ kimlik: kimlikSemasi });
export const bankaHesabiSilmeSemasi = z.strictObject({ kimlik: kimlikSemasi });
export const bankaHesaplariSiralamaSemasi = z.strictObject({
  sira: z.array(kimlikSemasi).max(bankaHesabiSinirlari.enCok),
});
