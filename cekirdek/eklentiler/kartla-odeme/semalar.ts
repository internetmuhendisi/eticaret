// Kartla ödeme eklentisinin uç şemaları (kart 0215, karar 0142).
import { z } from "zod";
import { kimlikSemasi } from "../../veritabani/kimlik.ts";

// Ödeme kuruluşunun belirteci (iyzico'nun token'ı): harf, rakam ve tire.
const belirtecSemasi = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9-]{1,200}$/);

// Tarayıcının dönüşü: kuruluş yalnız belirteci gönderir (form). Öteki alanlar yok sayılır.
export const donusSemasi = z.object({ token: belirtecSemasi });

// Kuruluşun bildirimi (JSON): imzası uçta doğrulanır, alanların biçimi iyzico.ts'te. Bilinmeyen alanlar yok sayılır.
export const bildirimSemasi = z.object({
  token: belirtecSemasi,
  paymentConversationId: z.string().max(200),
  iyziEventType: z.string().max(100).optional(),
  iyziPaymentId: z.union([z.string().max(100), z.number()]).optional(),
  status: z.string().max(100).optional(),
});

export const taksitlerSemasi = z.strictObject({ birim: kimlikSemasi });
