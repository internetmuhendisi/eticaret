// Tema uçlarının ekranla ortak girdi şemaları (kart 0113, .claude/rules/sunucu-arayuzu.md).
import { z } from "zod";
import { temaAyarlariSemasi } from "../../temalar/ayarlar.ts";
import { kodSemasi } from "../../temalar/sema.ts";
import { duzenYollari } from "../duzen/gecis.ts";

// Temayı ve ayarlarını yayınlar. Tema kodu değişiyorsa düzenin yolu zorunludur: yeni temanın düzenini
// uygulamak ya da düzeni korumak (kart 0113). Tema aynıysa düzen yolu yok sayılır, düzen değişmez.
export const temaYayiniSemasi = z.strictObject({
  tema: kodSemasi,
  ayarlar: temaAyarlariSemasi,
  duzen: z.enum(duzenYollari).optional(),
});
export type TemaYayiniGirdisi = z.input<typeof temaYayiniSemasi>;

// Önceki bir sürüme dönüş. Sıra verilmezse bir önceki sürüm: "son değişikliği geri al".
export const temaGeriDonusSemasi = z.strictObject({
  sira: z.number().int().positive().optional(),
});

// Tema durumunu okuma: girdi yok.
export const temaDurumuSemasi = z.strictObject({});
