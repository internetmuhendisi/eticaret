// E-posta girdisinin şeması (kart 0032, karar 0050).
import { z } from "zod";
import { epostaSablonlari } from "../../kayitlar/eposta.ts";

export const epostaGirdisi = z.strictObject({
  kime: z.email().max(254),
  sablon: z.enum(epostaSablonlari),
  degiskenler: z.record(z.string(), z.string()).default({}),
});
export type EpostaGirdisi = z.input<typeof epostaGirdisi>;
