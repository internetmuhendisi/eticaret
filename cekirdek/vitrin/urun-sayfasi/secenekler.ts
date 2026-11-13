// Ürün sayfasının seçenekleri ve okunur anahtarları (kart 0138, karar 0108). Sayfa ve sayfaya bağlantı kuran her
// yer (stoğa gelince haber ver e-postası, kart 0144) seçenekleri buradan kurar: adresteki "secenek-<seçenek>=<değer>"
// anahtarı iki yerde aynı kalır.
//
// Yalnız silinmemiş ve en az bir silinmemiş birleşimde geçen değerler, ürünün sırasıyla gelir. Anahtar addan
// üretilir (adres adı kuralı); çakışırsa listenin sırasıyla sıra numarası alır (tekilAnahtarlar).
import { adresAdiUret } from "../../metinler/adres-adi.ts";
import type { UrunSecenegi } from "../../moduller/urun/varyant.ts";
import { type SecimSecenegi, tekilAnahtarlar } from "./secim.ts";

const okunurAnahtar = (ad: string): string => adresAdiUret(ad) || ad.trim();

export const sayfaSecenekleri = (
  secenekler: readonly UrunSecenegi[],
  // Silinmemiş birimlerin değer kimlikleri.
  birimler: readonly { degerler: readonly string[] }[],
): SecimSecenegi[] => {
  const kullanilan = new Set(birimler.flatMap((birim) => birim.degerler));
  const gorunen = secenekler
    .filter((secenek) => !secenek.silindi)
    .map((secenek) => {
      const degerler = secenek.degerler.filter(
        (deger) => !deger.silindi && kullanilan.has(deger.kimlik),
      );
      const anahtarlar = tekilAnahtarlar(degerler.map((deger) => okunurAnahtar(deger.ad)));
      return {
        kimlik: secenek.kimlik,
        ad: secenek.ad,
        degerler: degerler.map((deger, i) => ({
          kimlik: deger.kimlik,
          ad: deger.ad,
          anahtar: anahtarlar[i] ?? deger.kimlik,
        })),
      };
    });
  const secenekAnahtarlari = tekilAnahtarlar(gorunen.map((secenek) => okunurAnahtar(secenek.ad)));
  return gorunen.map((secenek, i) => ({
    ...secenek,
    anahtar: secenekAnahtarlari[i] ?? secenek.kimlik,
  }));
};
