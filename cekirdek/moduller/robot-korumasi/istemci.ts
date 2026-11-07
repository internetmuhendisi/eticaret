// Robot sorusunu tarayıcıda çözer (kart 0033, karar 0051). Müşteri bir şey yapmaz, bulmaca görmez. Çözülemezse
// null döner: form genel hatayı gösterir. Yöntem değişirse değişiklik bu modüldedir.
import { solveChallenge } from "altcha-lib";
import { deriveKey } from "altcha-lib/algorithms/web/pbkdf2";
import { robotKorumasiAyari } from "../../kayitlar/robot-korumasi";

const soruUcu = "/kapi/herkese-acik/robot-sorusu";

export const robotCevabiAl = async (): Promise<string | null> => {
  try {
    const yanit = await fetch(soruUcu);
    if (!yanit.ok) return null;
    const { veri: soru } = await yanit.json();
    const cozum = await solveChallenge({
      challenge: soru,
      deriveKey,
      timeout: robotKorumasiAyari.cozumSuresiMs,
    });
    if (cozum === null) return null;
    const { counter, derivedKey } = cozum;
    return JSON.stringify({ soru, cozum: { counter, derivedKey } });
  } catch {
    return null;
  }
};
