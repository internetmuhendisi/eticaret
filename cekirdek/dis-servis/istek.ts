// Dış servise sunucudan istek (kart 0215, .claude/rules/e-ticaret-is-kurallari.md: kargo, fatura, pazaryeri ve ödeme
// bağlantıları aynı kalıpla). Sunucunun bir hizmete (ödeme kuruluşu) yaptığı her çağrı buradan gider: zaman aşımı
// zorunludur, gövde her zaman sonuna kadar okunur, ulaşılamayan hizmet DisServisHatasi atar. Tarayıcıdan kapıya istek
// bu dosyayı kullanmaz (kapiyaIstek, cekirdek/kapi/istemci.ts). Doğrudan fetch denetimde hatadır (dogrudan-istek.grit),
// bu dosya muaftır.
export class DisServisHatasi extends Error {}

export type DisServisYaniti = { durum: number; metin: string };

export const disServiseIstek = async (
  adres: string,
  secenekler: { yontem: "GET" | "POST"; basliklar: Record<string, string>; govde?: string },
  zamanAsimiMs: number,
): Promise<DisServisYaniti> => {
  try {
    const yanit = await fetch(adres, {
      method: secenekler.yontem,
      headers: secenekler.basliklar,
      ...(secenekler.govde === undefined ? {} : { body: secenekler.govde }),
      signal: AbortSignal.timeout(zamanAsimiMs),
      redirect: "error",
    });
    return { durum: yanit.status, metin: await yanit.text() };
  } catch (hata) {
    throw new DisServisHatasi(`Dış servise ulaşılamadı: ${new URL(adres).host}`, { cause: hata });
  }
};
