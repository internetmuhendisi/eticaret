// Müşteri kaydının ortak şeması (kart 0033): form ve uç aynı kuralları kullanır (.claude/rules/formlar.md).
// Müşteri girişi girisSemasi'ni kullanır (cekirdek/moduller/oturum/semalar.ts).
import { z } from "zod";
import { robotKorumasiAyari } from "../../kayitlar/robot-korumasi.ts";
import { epostaSemasi, sifreSemasi } from "../oturum/semalar.ts";

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
  robotCevabi: z.string().min(1).max(robotKorumasiAyari.cevapUzunlugu),
});
