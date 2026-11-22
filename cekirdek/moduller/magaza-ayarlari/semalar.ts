// Mağaza ayarları uçlarının ekranla ortak girdi şemaları (kart 0094, .claude/rules/sunucu-arayuzu.md).
import { z } from "zod";

// Logo yükleme: gövde dosyanın kendisidir (kapının dosya gövdesi, karar 0165). Tür ve sınırlar dosya servisinin
// kaydındadır (cekirdek/kayitlar/dosya.ts); boş dosya da servise gider, kendi koduyla döner.
export const logoYuklemeSemasi = z.strictObject({ dosya: z.instanceof(Uint8Array) });

// Logoyu kaldırma: girdi yok.
export const logoKaldirmaSemasi = z.strictObject({});
