// E-posta ve yeni şifre şemaları (kart 0025). Giriş ve kayıt ekranları da bunları kullanır.
import { z } from "zod";
import { sifreSiniri } from "../../kayitlar/oturum.ts";

export const epostaSemasi = z.string().trim().toLowerCase().max(254).pipe(z.email());

// Karmaşıklık kuralı yoktur: uzunluk şarttır. Üst sınır çok uzun metinle sunucuyu yormayı önler.
// Giriş ucu ile giriş formunun ortak şeması. Şifrenin alt sınırı burada aranmaz: kısa şifre "yanlış
// şifre" cevabını almalıdır, kuralı söylemek gereksizdir.
export const girisSemasi = z.strictObject({
  eposta: epostaSemasi,
  sifre: z.string().min(1).max(sifreSiniri.enUzun),
});

// İki aşamalı girişin kodu: 6 haneli zamanlı kod ya da yedek kod. Araya konan boşluk atılır.
export const kodSemasi = z.strictObject({
  kod: z
    .string()
    .max(32)
    .transform((kod) => kod.replace(/\s/g, ""))
    .pipe(z.string().min(1)),
});

export const sifreSemasi = z.string().min(sifreSiniri.enKisa).max(sifreSiniri.enUzun);
