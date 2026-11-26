// Sepetin tarayıcıdaki saklaması (kart 0212, karar 0135). Sepet yalnız tarayıcının deposundadır (localStorage), üye ve
// üye olmayan müşteride aynıdır, sunucuya yalnız hesap için gider. Yalnız birim kimlikleri, adetler ve müşterinin son
// gördüğü birim fiyatı saklanır; kişisel bilgi yazılmaz. Sepet sayfasının çerezi de yalnız burada okunur ve yazılır.
//
// Depo okunamazsa (gizli pencere, kapalı depo) sepet boş sayılır, hata vermez. Bozuk değer atılır. Bu dosya her vitrin
// sayfasının üst kısmıyla tarayıcıya gider: zod'u taşımaz, biçim kimlik-bicimi.ts'in kuralıyla denetlenir (kart 0146).
import { kuponKoduSinirlari } from "../../kayitlar/kupon-kodu";
import {
  sepetCerezi,
  sepetDepoAnahtari,
  sepetKuponAnahtari,
  sepetSinirlari,
} from "../../kayitlar/sepet";
import { kimligiDuzelt, semayaUyanKimlikMi } from "../../veritabani/kimlik-bicimi";

export type YerelKalem = { birim: string; adet: number; gorulenTutar?: number };

const tamSayiMi = (deger: unknown, enAz: number, enCok: number): deger is number =>
  typeof deger === "number" && Number.isInteger(deger) && deger >= enAz && deger <= enCok;

// Dışarıdan gelen değeri kalem listesine çevirir: biçimi bozuk, tekrar eden ve fazla olan atılır.
export const kalemListesi = (degerler: readonly unknown[]): YerelKalem[] => {
  const goruldu = new Set<string>();
  const sonuc: YerelKalem[] = [];
  for (const deger of degerler) {
    if (typeof deger !== "object" || deger === null) continue;
    const { birim, adet, gorulenTutar } = deger as Record<string, unknown>;
    if (typeof birim !== "string" || !semayaUyanKimlikMi(birim)) continue;
    if (!tamSayiMi(adet, 1, sepetSinirlari.adetEnCok)) continue;
    const kimlik = kimligiDuzelt(birim);
    if (goruldu.has(kimlik)) continue;
    goruldu.add(kimlik);
    sonuc.push({
      birim: kimlik,
      adet,
      ...(tamSayiMi(gorulenTutar, 0, Number.MAX_SAFE_INTEGER) ? { gorulenTutar } : {}),
    });
  }
  return sonuc.slice(0, sepetSinirlari.kalemEnCok);
};

export const yereldenOku = (): YerelKalem[] => {
  try {
    const ham = window.localStorage.getItem(sepetDepoAnahtari);
    if (ham === null) return [];
    const deger: unknown = JSON.parse(ham);
    return Array.isArray(deger) ? kalemListesi(deger) : [];
  } catch {
    return [];
  }
};

// Sepet sayfasının çerezi (kart 0218, karar 0136): yalnız kalem sayısı. Sunucu bunu okuyup boş sepeti hemen çizer.
// Bozuk ya da olmayan değer 0'dır (boş sepet).
export const cerezdekiSayi = (metin: string | undefined): number => {
  if (metin === undefined || !/^\d{1,3}$/.test(metin)) return 0;
  return Math.min(Number(metin), sepetSinirlari.kalemEnCok);
};

// Çerezi depodaki sepetle eşitler: boş sepette siler. Yazılamazsa sepet sayfası bir an boş hâli gösterebilir.
export const cereziYaz = (kalemSayisi: number): void => {
  try {
    for (const yol of sepetCerezi.yollar) {
      const ek = `; Path=${yol}; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
      // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API her tarayıcıda yok; çerez yalnız sayı taşır.
      document.cookie =
        kalemSayisi > 0
          ? `${sepetCerezi.ad}=${kalemSayisi}${ek}; Max-Age=${sepetCerezi.saniye}`
          : `${sepetCerezi.ad}=${ek}; Max-Age=0`;
    }
  } catch {
    // Çerez yazılamazsa sepet yine depodadır.
  }
};

// Yazılamazsa (dolu ya da kapalı depo) false döner: sepet yalnız bu sayfada kalır. Çerez her yazımda eşitlenir.
export const yereleYaz = (kalemler: readonly YerelKalem[]): boolean => {
  cereziYaz(kalemler.length);
  try {
    if (kalemler.length === 0) window.localStorage.removeItem(sepetDepoAnahtari);
    else window.localStorage.setItem(sepetDepoAnahtari, JSON.stringify(kalemler));
    return true;
  } catch {
    return false;
  }
};

// Sepetin kupon kodu (kart 0312). Biçimi yalnız uzunlukla denetlenir: geçip geçmediğini sunucu söyler.
export const kuponuOku = (): string | undefined => {
  try {
    const kod = window.localStorage.getItem(sepetKuponAnahtari)?.trim();
    return kod === undefined || kod.length === 0 || kod.length > kuponKoduSinirlari.kodEnCok
      ? undefined
      : kod;
  } catch {
    return undefined;
  }
};

export const kuponuYaz = (kod: string | undefined): void => {
  try {
    if (kod === undefined) window.localStorage.removeItem(sepetKuponAnahtari);
    else window.localStorage.setItem(sepetKuponAnahtari, kod);
  } catch {
    // Yazılamazsa kupon yalnız bu sayfada kalır.
  }
};
