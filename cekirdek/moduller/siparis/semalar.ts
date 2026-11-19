// Siparişin uç ve form şemaları (kart 0214, karar 0141; .claude/rules/formlar.md). Havale bildirimi formu ile uç aynı
// şemayı kullanır. Tutar sitenin para biçimiyle yazılı gelir ("1.399,60"); kuruşa çeviren sipariş servisidir, çünkü
// biçim sitenin ayarıdır. Ödeme günü YYYY-AA-GG'dir (tarih alanı); takvimde olup olmadığını servis denetler.
import { z } from "zod";
import { havaleBildirimiSinirlari } from "../../kayitlar/odeme.ts";
import {
  siparisDurumlari,
  siparisNotTurleri,
  siparisNumarasiKalibi,
  siparisSinirlari,
} from "../../kayitlar/siparis.ts";
import { duzMetinSemasi } from "../../metinler/duz-metin.ts";
import { kimlikSemasi } from "../../veritabani/kimlik.ts";
import { epostaSemasi } from "../oturum/semalar.ts";
import { robotCevabiSemasi } from "../robot-korumasi/semalar.ts";

const bosIseYok = (deger: unknown) =>
  typeof deger === "string" && deger.trim() === "" ? undefined : deger;

// Numara büyük ya da küçük harfle, boşluklu yazılabilir: karşılaştırmadan önce düzelir.
export const siparisNumarasiSemasi = z
  .string()
  .max(40)
  .transform((yazi) => yazi.replace(/\s+/g, "").toUpperCase())
  .pipe(z.string().regex(siparisNumarasiKalibi, "numara-bicimi"));

export const havaleBildirimiFormuSemasi = z.strictObject({
  numara: siparisNumarasiSemasi,
  gonderen: duzMetinSemasi(havaleBildirimiSinirlari.gonderenEnCok),
  hesap: kimlikSemasi,
  tutar: z.string().trim().min(1).max(40),
  odemeTarihi: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "tarih-bicimi"),
  not: z.preprocess(bosIseYok, duzMetinSemasi(havaleBildirimiSinirlari.notEnCok).optional()),
});
export type HavaleBildirimiFormu = z.output<typeof havaleBildirimiFormuSemasi>;

// Üye olmayan müşteri siparişteki e-postayı da verir; üye olanın siparişi hesabından bulunur.
export const misafirHavaleBildirimiFormuSemasi = havaleBildirimiFormuSemasi.extend({
  eposta: epostaSemasi,
});

export const misafirHavaleBildirimiGirdisi = misafirHavaleBildirimiFormuSemasi.extend({
  robotCevabi: robotCevabiSemasi,
});
export const uyeHavaleBildirimiGirdisi = havaleBildirimiFormuSemasi;

// Panelin sipariş uçları (kart 0234). Liste: durum süzgeci, aranan metin (numara, ad ya da e-posta) ve sayfa. İşlem:
// ekranın gördüğü durumla gelir; arada durum değiştiyse servis "cakisma" verir. Kargo işleminde firma listedeki
// kimliktir, takip numarası isteğe bağlıdır.
export const siparisListesiSemasi = z.strictObject({
  durum: z.enum(siparisDurumlari).optional(),
  ara: z.preprocess(bosIseYok, z.string().trim().max(siparisSinirlari.aramaEnCok).optional()),
  sayfa: z.coerce.number().int().min(1).max(10_000).default(1),
});
export type SiparisListesiGirdisi = z.output<typeof siparisListesiSemasi>;

export const siparisAyrintisiSemasi = z.strictObject({ numara: siparisNumarasiSemasi });

export const takipNumarasiSemasi = z
  .string()
  .trim()
  .max(siparisSinirlari.takipNumarasiEnCok)
  .regex(/^[A-Za-z0-9][A-Za-z0-9 -]*$/, "takip-numarasi-bicimi");

export const kargoBilgisiSemasi = z.strictObject({
  firma: kimlikSemasi,
  takipNumarasi: z.preprocess(bosIseYok, takipNumarasiSemasi.optional()),
});
export type KargoBilgisi = z.output<typeof kargoBilgisiSemasi>;

// Yönetim izniyle yapılan işlemler; havale onayı kendi ucundan, kendi izniyle gelir (siparisIslemleri).
const yonetimIslemleri = [
  "hazirlamaya-al",
  "kargoya-ver",
  "kargo-duzelt",
  "teslim-edildi",
] as const;

export const siparisIslemiSemasi = z.strictObject({
  numara: siparisNumarasiSemasi,
  islem: z.enum(yonetimIslemleri),
  gorulenDurum: z.enum(siparisDurumlari),
  kargo: kargoBilgisiSemasi.optional(),
});
export type SiparisIslemiGirdisi = z.output<typeof siparisIslemiSemasi>;

export const havaleOnayiSemasi = z.strictObject({
  numara: siparisNumarasiSemasi,
  gorulenDurum: z.enum(siparisDurumlari),
});

export const siparisNotuSemasi = z.strictObject({
  numara: siparisNumarasiSemasi,
  tur: z.enum(siparisNotTurleri),
  metin: duzMetinSemasi(siparisSinirlari.notEnCok),
});
export type SiparisNotuGirdisi = z.output<typeof siparisNotuSemasi>;

// Sipariş ayarlarının kargo firmaları bölümü: ekran bütün listeyi gördüğü hâliyle (onceki) ve yeni hâliyle verir;
// yeni firmanın kimliği yoktur, servis verir. Arada liste değiştiyse "cakisma".
const firmaGirdisi = z.strictObject({
  kimlik: kimlikSemasi.optional(),
  ad: z.string().trim().min(1).max(siparisSinirlari.kargoFirmasiAdEnCok),
  takipAdresi: z.preprocess(
    bosIseYok,
    z.string().trim().max(siparisSinirlari.takipAdresiEnCok).optional(),
  ),
});
export type KargoFirmasiGirdisi = z.output<typeof firmaGirdisi>;

export const kargoFirmalariSemasi = z.strictObject({
  onceki: z.array(kimlikSemasi).max(siparisSinirlari.kargoFirmasiEnCok),
  firmalar: z.array(firmaGirdisi).max(siparisSinirlari.kargoFirmasiEnCok),
});
export type KargoFirmalariGirdisi = z.output<typeof kargoFirmalariSemasi>;

export const kargoFirmalariDurumuSemasi = z.strictObject({});
