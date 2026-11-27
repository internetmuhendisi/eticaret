// Adres adının kullanılıp kullanılmadığı (kart 0330, karar 0193). Kategori, marka, etiket, ürün, blog yazısı ve
// sabit sayfa yeni ya da değişen adres adını yalnız bununla denetler ve addan üretir.
//
// Bir adres adı bir türde iki durumda kullanılmıştır:
// - Aynı türden silinmemiş bir kayıt onu taşıyor (adres tekildir).
// - Aynı türden silinmemiş bir kaydın eski adresi (eski_adresler): eski bağlantılar o kayda yönlenir
//   (karar 0103). Başka kayıt bu adı alsaydı yönlendirme kesilir, eski bağlantı yeni kaydı açardı.
// Silinmiş kaydın eski adresi serbesttir: o adres zaten "bulunamadı"ya düşer. Kaydın kendi eski adresi de
// serbesttir: kayıt eski adına dönebilir (haric).
//
// Üretilen adres kullanılmışsa sayı alır (bosAdresAdi). Elle verilen adres canlı kayıtta "tekrar", eski adreste
// "eski-adres" sonucunu alır; servis ikisini de reddeder (kullanıcı kararı, karar 0193). Çözücünün kuralı
// (yaşayan kayıt kazanır) doğrudan veritabanı yazısı için değişmez. Çağıran yarışı kendi kilidiyle önler.
import { and, eq, inArray, isNull, ne } from "drizzle-orm";
import type { AdresliKayitTuru } from "../../kayitlar/adres.ts";
import { bosAdresAdi } from "../../metinler/adres-adi.ts";
import type { VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { etiketler } from "../etiket/model.ts";
import { blogYazilari, sabitSayfalar } from "../icerik/model.ts";
import { kategoriler } from "../kategori/model.ts";
import { markalar } from "../marka/model.ts";
import { urunler } from "../urun/model.ts";
import { eskiAdresler } from "./model.ts";

const tablolar = {
  kategori: kategoriler,
  marka: markalar,
  etiket: etiketler,
  urun: urunler,
  "blog-yazisi": blogYazilari,
  sayfa: sabitSayfalar,
} as const satisfies Record<AdresliKayitTuru, unknown>;

export type AdresAdiDurumu = "bos" | "tekrar" | "eski-adres";

// Adaylardan kullanılmış olanlar, her biri neden kullanılmışsa onunla. Tek sorgu çifti atar.
const kullanimlar = async (
  islem: VeritabaniIslemi,
  tur: AdresliKayitTuru,
  adaylar: string[],
  haric?: string,
): Promise<Map<string, Exclude<AdresAdiDurumu, "bos">>> => {
  const tablo = tablolar[tur];
  const [canli, eski] = await Promise.all([
    islem
      .select({ adresAdi: tablo.adres_adi })
      .from(tablo)
      .where(
        and(
          inArray(tablo.adres_adi, adaylar),
          isNull(tablo.silinme_zamani),
          haric === undefined ? undefined : ne(tablo.kimlik, haric),
        ),
      ),
    islem
      .select({ adresAdi: eskiAdresler.adres_adi })
      .from(eskiAdresler)
      .innerJoin(tablo, eq(tablo.kimlik, eskiAdresler.kayit_kimligi))
      .where(
        and(
          eq(eskiAdresler.kayit_turu, tur),
          inArray(eskiAdresler.adres_adi, adaylar),
          isNull(tablo.silinme_zamani),
          haric === undefined ? undefined : ne(tablo.kimlik, haric),
        ),
      ),
  ]);
  const sonuc = new Map<string, Exclude<AdresAdiDurumu, "bos">>();
  for (const satir of eski) sonuc.set(satir.adresAdi, "eski-adres");
  // Canlı kayıt öncelidir: eski adres bugün yaşayan bir kaydın adıysa (doğrudan yazı) "tekrar"dır.
  for (const satir of canli) sonuc.set(satir.adresAdi, "tekrar");
  return sonuc;
};

// Elle verilen adres adı. haric: değişen kaydın kendisi (kendi adresi ve eski adresleri serbesttir).
export const adresAdiDurumu = async (
  islem: VeritabaniIslemi,
  tur: AdresliKayitTuru,
  adresAdi: string,
  haric?: string,
): Promise<AdresAdiDurumu> =>
  (await kullanimlar(islem, tur, [adresAdi], haric)).get(adresAdi) ?? "bos";

// Elle verilen adres adının hata kodu; kullanılabilirse yok. Kodlar her türün hata listesindedir.
export const adresAdiHatasi = async (
  islem: VeritabaniIslemi,
  tur: AdresliKayitTuru,
  adresAdi: string,
  haric?: string,
): Promise<"adres-adi-tekrar" | "adres-adi-eski" | undefined> => {
  const durum = await adresAdiDurumu(islem, tur, adresAdi, haric);
  if (durum === "tekrar") return "adres-adi-tekrar";
  if (durum === "eski-adres") return "adres-adi-eski";
  return undefined;
};

// Addan üretilen boş adres adı (cekirdek/metinler/adres-adi.ts): kullanılmışsa sayı alır ("x-2").
export const bosAdresAdiBul = (
  islem: VeritabaniIslemi,
  tur: AdresliKayitTuru,
  ad: string,
  kimlik: string,
): Promise<string> =>
  bosAdresAdi(
    ad,
    kimlik,
    async (adaylar) => new Set((await kullanimlar(islem, tur, adaylar)).keys()),
  );
