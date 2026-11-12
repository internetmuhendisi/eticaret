// Favori listesinin tarayıcıdaki saklaması (kart 0140, karar 0110). Yalnız ürün kimlikleri saklanır; kimlik,
// e-posta ya da başka kişisel bilgi yazılmaz.
//
// - Üye olmayan müşterinin listesi tarayıcının deposundadır (localStorage). Sunucuya gitmez; giriş ya da kayıttan
//   sonra hesaba birleşip silinir.
// - Favoriler sayfası ürün kartlarını sunucuda çizer ama sayfa çizilirken müşterinin oturumu okunamaz
//   (karar 0039). Bu yüzden geçerli liste, girişli müşteride de, yalnız /favoriler yoluna giden bir çerezle
//   sunucuya taşınır. Çerez tarayıcı kapanınca silinir ve başka hiçbir sayfaya gönderilmez.
//
// Depo ve çerez okunamazsa (gizli pencere, kapalı depo) liste boş sayılır, hata vermez.

import { favoriCerezi, favoriDepoAnahtari, favoriSiniriEnCok } from "../kayitlar/favori";
import { kimlikSemasi } from "../veritabani/kimlik";

// Dışarıdan gelen değeri kimlik listesine çevirir: kimlik olmayan, tekrar eden ve fazla olan atılır. Kimlikler ortak
// şemayla küçük harfe çevrilir (veritabanı küçük harfle döner, kart 0119); şema dosyası yalnız zod alır, tarayıcı
// paketine veritabanı kodu girmez.
export const kimlikListesi = (degerler: readonly unknown[]): string[] =>
  [
    ...new Set(
      degerler.flatMap((deger) => {
        const sonuc = kimlikSemasi.safeParse(deger);
        return sonuc.success ? [sonuc.data] : [];
      }),
    ),
  ].slice(0, favoriSiniriEnCok);

export const cerezMetniniOku = (metin: string | undefined): string[] =>
  metin === undefined || metin === "" ? [] : kimlikListesi(metin.split(favoriCerezi.ayirici));

export const yereldenOku = (): string[] => {
  try {
    const ham = window.localStorage.getItem(favoriDepoAnahtari);
    if (ham === null) return [];
    const deger: unknown = JSON.parse(ham);
    return Array.isArray(deger) ? kimlikListesi(deger) : [];
  } catch {
    return [];
  }
};

// Yazılamazsa (dolu ya da kapalı depo) false döner: liste yalnız bu sayfada kalır.
export const yereleYaz = (urunler: readonly string[]): boolean => {
  try {
    if (urunler.length === 0) window.localStorage.removeItem(favoriDepoAnahtari);
    else window.localStorage.setItem(favoriDepoAnahtari, JSON.stringify(urunler));
    return true;
  } catch {
    return false;
  }
};

const cerezEki = () =>
  `; Path=${favoriCerezi.yol}; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;

export const cereziYaz = (urunler: readonly string[]): void => {
  try {
    // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API her tarayıcıda yok; çerez yalnız kimlik taşır.
    document.cookie = `${favoriCerezi.ad}=${urunler.join(favoriCerezi.ayirici)}${cerezEki()}`;
  } catch {
    // Çerez yazılamazsa favoriler sayfası boş listeyle açılır.
  }
};

export const cereziSil = (): void => {
  try {
    // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API her tarayıcıda yok; çerez yalnız kimlik taşır.
    document.cookie = `${favoriCerezi.ad}=${cerezEki()}; Max-Age=0`;
  } catch {
    // Silinemezse tarayıcı kapanınca gider.
  }
};
