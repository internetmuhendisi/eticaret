// Panelin bildirim uçlarının girdileri (kart 0280, karar 0198): liste ve sayı girdisizdir; okundu ya bir bildirimin
// kimliğini ya da görülebilen bütün okunmamışları ("hepsi") alır.
import { z } from "zod";
import { kimlikSemasi } from "../../veritabani/kimlik.ts";

export const panelBildirimleriSemasi = z.strictObject({});

export const panelBildirimiOkunduSemasi = z.union([
  z.strictObject({ kimlik: kimlikSemasi }),
  z.strictObject({ hepsi: z.literal(true) }),
]);
export type PanelBildirimiOkunduGirdisi = z.infer<typeof panelBildirimiOkunduSemasi>;
