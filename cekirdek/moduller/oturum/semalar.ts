// E-posta ve yeni şifre şemaları (kart 0025). Giriş ve kayıt ekranları da bunları kullanır.
import { z } from "zod";
import { sifreSiniri } from "../../kayitlar/oturum.ts";

export const epostaSemasi = z.string().trim().toLowerCase().max(254).pipe(z.email());

// Karmaşıklık kuralı yoktur: uzunluk şarttır. Üst sınır çok uzun metinle sunucuyu yormayı önler.
export const sifreSemasi = z.string().min(sifreSiniri.enKisa).max(sifreSiniri.enUzun);
