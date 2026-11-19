// Müşteri kaydının ortak şeması (kart 0033): form ve uç aynı kuralları kullanır (.claude/rules/formlar.md).
// Müşteri girişi girisSemasi'ni kullanır (cekirdek/moduller/oturum/semalar.ts).
import { z } from "zod";
import { sifreSiniri } from "../../kayitlar/oturum.ts";
import { epostaSemasi, sifreSemasi } from "../oturum/semalar.ts";
import { robotCevabiSemasi } from "../robot-korumasi/semalar.ts";

export const kayitFormuSemasi = z.strictObject({
  eposta: epostaSemasi,
  sifre: sifreSemasi,
  // Zorunlu onaylar: true dışında bir değer kayıt açmaz.
  uyelikOnayi: z.literal(true),
  kvkkOnayi: z.literal(true),
  // Pazarlama izni isteğe bağlıdır, kutu işaretsiz gelir.
  pazarlamaIzni: z.boolean(),
});

export const kayitSemasi = kayitFormuSemasi.extend({
  robotCevabi: robotCevabiSemasi,
});

// Hesap bilgileri (kart 0237). Şu anki şifre yalnız doğrulanır: kuralı (en kısa) eski hesaplarda farklı olabilir,
// yalnız boş olmaması ve en uzun sınır denetlenir.
export const sifreDegistirSemasi = z.strictObject({
  mevcutSifre: z.string().min(1).max(sifreSiniri.enUzun),
  yeniSifre: sifreSemasi,
});
export const pazarlamaIzniSemasi = z.strictObject({ verildi: z.boolean() });
export const hesapBilgileriSemasi = z.strictObject({});

// Vitrinin hesap durumu sorusu (kart 0187): girdi almaz.
export const hesapDurumuSemasi = z.strictObject({});
export type HesapDurumuCevabi = { girisli: false } | { girisli: true; eposta: string };
