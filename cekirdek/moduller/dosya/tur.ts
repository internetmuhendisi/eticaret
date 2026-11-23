// İçeriğin başındaki baytlardan dosya türü (kart 0072, 0073). Görsel kütüphanesine bağlı değildir:
// site klasörünü okuyan kod ve dosyayı tarayıcıya veren uç da kullanır.
import {
  type BelgeTuru,
  belgeTurleri,
  type DosyaTuru,
  dosyaTurleri,
} from "../../kayitlar/dosya.ts";

// Hiçbir imzaya uymuyorsa undefined.
export const icerikTuru = (icerik: Uint8Array): DosyaTuru | undefined =>
  (Object.keys(dosyaTurleri) as DosyaTuru[]).find((tur) =>
    dosyaTurleri[tur].imzalar.some(
      (imza) =>
        icerik.length >= imza.length &&
        imza.every((bayt, sira) => bayt === null || icerik[sira] === bayt),
    ),
  );

// Uzantıdan tür; tanınmayan uzantı undefined.
export const uzantininTuru = (uzanti: string): DosyaTuru | undefined =>
  (Object.keys(dosyaTurleri) as DosyaTuru[]).find((tur) => dosyaTurleri[tur].uzanti === uzanti);

// Belge türü (kart 0268): yalnız belge imzalarına bakar; görsel imzası belge sayılmaz.
export const belgeTuru = (icerik: Uint8Array): BelgeTuru | undefined =>
  (Object.keys(belgeTurleri) as BelgeTuru[]).find((tur) =>
    belgeTurleri[tur].imzalar.some(
      (imza) =>
        icerik.length >= imza.length &&
        imza.every((bayt, sira) => bayt === null || icerik[sira] === bayt),
    ),
  );
