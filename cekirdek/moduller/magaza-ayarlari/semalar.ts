// Mağaza ayarları uçlarının ekranla ortak girdi şemaları (kart 0094, .claude/rules/sunucu-arayuzu.md).
import { z } from "zod";
import { dosyaGovdesiSemasi } from "../dosya/semalar.ts";

// Logo yükleme: gövde dosyanın kendisidir (dosya yükleyen uçların ortak şeması, karar 0165).
export const logoYuklemeSemasi = dosyaGovdesiSemasi;

// Logoyu kaldırma: girdi yok.
export const logoKaldirmaSemasi = z.strictObject({});
