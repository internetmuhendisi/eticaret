// Robot sorusunu tarayıcıda çözer (kart 0033, karar 0051). Müşteri bir şey yapmaz, bulmaca görmez. Çözülemezse
// null döner: form genel hatayı gösterir. Yöntem değişirse değişiklik bu modüldedir.
import { solveChallenge } from "altcha-lib";
import { deriveKey } from "altcha-lib/algorithms/web/pbkdf2";
import { useEffect, useRef } from "react";
import { kapiyaIstek } from "../../kapi/istemci";
import { hataKodlari } from "../../kayitlar/kapi";
import { robotKorumasiAyari } from "../../kayitlar/robot-korumasi";

const soruUcu = "/kapi/herkese-acik/robot-sorusu";

export const robotCevabiAl = async (): Promise<string | null> => {
  try {
    const yanit = await kapiyaIstek(soruUcu, { cache: "no-store" });
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

// Robotlu formların gönderimi (kartlar 0033, 0034). Cevap form açılınca arkada hazırlanır. Her cevap bir kez
// geçer: gönderimden sonra yenisi hazırlanır. Arkadaki çözüm tutmadıysa gönderirken bir kez daha denenir.
// Sunucu cevabı reddederse (soru süresi dolmuş, site yeniden başlamış) müşteri fark etmeden bir kez daha gider.
//
// ertele (kart 0112): her sayfada duran form (ana sayfanın bülten kaydı) açılınca soru istenmez ve çözülmez;
// ilk cevap gönderirken hazırlanır. Her ziyaretçinin her açılışta işlemci ve ağ harcamasını önler.
export const useRobotluGonderim = ({ ertele = false }: { ertele?: boolean } = {}) => {
  const hazirlanan = useRef<Promise<string | null> | null>(null);

  useEffect(() => {
    if (!ertele) hazirlanan.current = robotCevabiAl();
  }, [ertele]);

  const siradakiCevap = async () => {
    const hazir = hazirlanan.current;
    // Ertelenmişte bir sonraki cevap önceden hazırlanmaz: ilk gönderim iki soru istemesin.
    hazirlanan.current = ertele ? null : robotCevabiAl();
    return (hazir === null ? null : await hazir) ?? robotCevabiAl();
  };

  const istekGonder = async (ucAdresi: string, girdi: object) =>
    kapiyaIstek(ucAdresi, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...girdi, robotCevabi: await siradakiCevap() }),
    });

  return async (ucAdresi: string, girdi: object): Promise<Response> => {
    const yanit = await istekGonder(ucAdresi, girdi);
    return yanit.status === hataKodlari["robot-dogrulamasi"] ? istekGonder(ucAdresi, girdi) : yanit;
  };
};
