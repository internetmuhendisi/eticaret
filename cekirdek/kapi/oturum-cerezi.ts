// Oturum çerezleri ve istekten oturumun okunması (kart 0025, karar 0039). Kısa anahtarın süresi
// dolduysa yenileme anahtarıyla sessizce yenilenir; müşteri ya da yönetici fark etmez.
// Kapı izin kontrolünü (kart 0026) bunun üstüne kurar.
import type { SiteAyarlari } from "../ayar-semasi/ayarlar.ts";
import { type HesapTuru, kisaAnahtarSuresiSaniye, oturumCerezAdlari } from "../kayitlar/oturum.ts";
import { type Anahtarlar, oturumuDogrula, oturumuYenile } from "../moduller/oturum/servis.ts";
import type { Veritabani } from "../veritabani/baglanti.ts";

const cerez = (ad: string, deger: string, azamiYasSaniye: number): string =>
  `${ad}=${deger}; Path=/; Max-Age=${azamiYasSaniye}; HttpOnly; Secure; SameSite=Lax`;

export const oturumCerezleri = (
  tur: HesapTuru,
  anahtarlar: Anahtarlar,
  sureSaniye: number,
): string[] => [
  cerez(oturumCerezAdlari[tur].kisa, anahtarlar.kisaAnahtar, kisaAnahtarSuresiSaniye),
  cerez(oturumCerezAdlari[tur].yenileme, anahtarlar.yenilemeAnahtari, sureSaniye),
];

export const oturumCerezleriniSil = (tur: HesapTuru): string[] => [
  cerez(oturumCerezAdlari[tur].kisa, "", 0),
  cerez(oturumCerezAdlari[tur].yenileme, "", 0),
];

// Çerez başlığında yalnız boşluk ve sekme kırpılır; trim() başka karakterleri de siler,
// "\xA0__Host-..." gibi bir ad da __Host- çerezi sanılırdı.
const bosluksuz = (metin: string): string => metin.replace(/^[ \t]+|[ \t]+$/g, "");

export const cerezOku = (istek: Request, ad: string): string | undefined => {
  for (const parca of istek.headers.get("cookie")?.split(";") ?? []) {
    const ayirici = parca.indexOf("=");
    if (ayirici !== -1 && bosluksuz(parca.slice(0, ayirici)) === ad) {
      return bosluksuz(parca.slice(ayirici + 1));
    }
  }
  return undefined;
};

export const istektekiAnahtarlar = (istek: Request, tur: HesapTuru): Partial<Anahtarlar> => {
  const kisaAnahtar = cerezOku(istek, oturumCerezAdlari[tur].kisa);
  const yenilemeAnahtari = cerezOku(istek, oturumCerezAdlari[tur].yenileme);
  return {
    ...(kisaAnahtar === undefined ? {} : { kisaAnahtar }),
    ...(yenilemeAnahtari === undefined ? {} : { yenilemeAnahtari }),
  };
};

// Oturumun hareketsizlik süresi site ayarından gelir.
export const oturumSuresiSaniye = (tur: HesapTuru, ayarlar: SiteAyarlari): number =>
  tur === "yonetici"
    ? ayarlar.yoneticiOturumuSaat * 60 * 60
    : ayarlar.musteriOturumuGun * 24 * 60 * 60;

// hesapKimligi null ise oturum yoktur. cerezler yanıta yazılmalıdır: yenilenen anahtarları ya da
// geçersiz anahtarların silinmesini taşır. Bu yüzden yalnız çerez yazabilen yerde (uç, ara katman)
// çağrılır: sayfa çizerken çağrılırsa anahtar yenilenir ama yenisi tarayıcıya gitmez, oturum kapanır.
export const istektenOturumAl = async (
  vt: Veritabani,
  tur: HesapTuru,
  istek: Request,
  sureSaniye: number,
): Promise<{ hesapKimligi: string | null; cerezler: string[] }> => {
  const { kisaAnahtar, yenilemeAnahtari } = istektekiAnahtarlar(istek, tur);

  if (kisaAnahtar !== undefined) {
    const oturum = await oturumuDogrula(vt, tur, kisaAnahtar);
    if (oturum !== null) return { hesapKimligi: oturum.hesapKimligi, cerezler: [] };
  }
  if (yenilemeAnahtari !== undefined) {
    const sonuc = await oturumuYenile(vt, tur, yenilemeAnahtari, sureSaniye);
    if (sonuc.durum === "yenilendi") {
      return {
        hesapKimligi: sonuc.hesapKimligi,
        cerezler: oturumCerezleri(tur, sonuc.anahtarlar, sureSaniye),
      };
    }
    if (sonuc.durum === "tolerans") return { hesapKimligi: sonuc.hesapKimligi, cerezler: [] };
  }
  return {
    hesapKimligi: null,
    cerezler:
      kisaAnahtar === undefined && yenilemeAnahtari === undefined ? [] : oturumCerezleriniSil(tur),
  };
};
