// Robot cevabının uçlardaki şeması (karar 0051). Doğrulaması servis.ts içindedir.
import { z } from "zod";
import { robotKorumasiAyari } from "../../kayitlar/robot-korumasi.ts";

export const robotCevabiSemasi = z.string().min(1).max(robotKorumasiAyari.cevapUzunlugu);
