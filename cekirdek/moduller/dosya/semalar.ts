// Dosya yükleyen uçların ekranla ortak girdi şeması (kart 0094, karar 0165; .claude/rules/sunucu-arayuzu.md). Gövde
// dosyanın kendisidir (kapının dosya gövdesi); tür ve sınırlar dosya servisinin kaydındadır (cekirdek/kayitlar/dosya.ts),
// boş dosya da servise gider, kendi koduyla döner.
import { z } from "zod";

export const dosyaGovdesiSemasi = z.strictObject({ dosya: z.instanceof(Uint8Array) });
