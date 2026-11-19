// Havale bildiriminin ve sipariş numarasının şemaları (kart 0214, karar 0141; .claude/rules/formlar.md). Vitrinin
// havale bildirimi formu ile uç aynı şemayı kullanır. Tutar sitenin para biçimiyle yazılı gelir ("1.399,60"); kuruşa
// çeviren sipariş servisidir, çünkü biçim sitenin ayarıdır. Ödeme günü YYYY-AA-GG'dir (tarih alanı); takvimde olup
// olmadığını servis denetler.
// Bu dosya tarayıcıya gider: panelin şemalarını (semalar.ts) ve ödeme adımının adres ve fatura şemalarını içe
// aktarmaz. Onlarla birlikte havale bildirimi sayfasının kodu 19 KB büyümüş, hız ölçümünün sınırını aşmıştı (kart 0248).
import { z } from "zod";
import { havaleBildirimiSinirlari } from "../../kayitlar/odeme.ts";
import { siparisNumarasiKalibi } from "../../kayitlar/siparis.ts";
import { duzMetinSemasi } from "../../metinler/duz-metin.ts";
import { kimlikSemasi } from "../../veritabani/kimlik.ts";
import { epostaSemasi } from "../oturum/semalar.ts";
import { robotCevabiSemasi } from "../robot-korumasi/semalar.ts";

// Boş ya da yalnız boşluklu metin verilmemiş sayılır (isteğe bağlı alanlar).
export const bosIseYok = (deger: unknown) =>
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
