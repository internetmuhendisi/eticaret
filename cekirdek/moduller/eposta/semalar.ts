// E-posta girdisinin şeması (kart 0032, karar 0050).
import { z } from "zod";
import { epostaSablonlari } from "../../kayitlar/eposta.ts";

export const epostaGirdisi = z.strictObject({
  kime: z.email().max(254),
  sablon: z.enum(epostaSablonlari),
  degiskenler: z.record(z.string(), z.string()).default({}),
  // Sipariş e-postasının olay anındaki verisi (kart 0240, karar 0153); gönderilince silinir.
  veri: z.record(z.string(), z.unknown()).optional(),
  // Olayın kalıcı kaydına bağlı anahtar: aynı anahtarla ikinci e-posta yazılmaz.
  olayAnahtari: z.string().min(1).max(200).optional(),
});
export type EpostaGirdisi = z.input<typeof epostaGirdisi>;
