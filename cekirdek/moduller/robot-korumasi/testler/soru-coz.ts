// Testlerin robot cevabı: tarayıcının yaptığı işi Node'da yapar. Tarayıcıdaki çözüm tarayıcı testinde dener.
import { type Challenge, solveChallenge } from "altcha-lib";
import { deriveKey } from "altcha-lib/algorithms/pbkdf2";

export const soruyuCoz = async (soru: Challenge): Promise<string> => {
  const cozum = await solveChallenge({ challenge: soru, deriveKey });
  if (cozum === null) throw new Error("Soru çözülemedi.");
  const { counter, derivedKey } = cozum;
  return JSON.stringify({ soru, cozum: { counter, derivedKey } });
};
