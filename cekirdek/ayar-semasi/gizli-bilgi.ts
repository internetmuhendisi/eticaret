// Gizli bilgiyi okuyan tek yer (kart 0019, karar 0031).
// - Sunucuda değer dosyadadır: <AD>_DOSYASI ortam değişkeni dosyanın yolunu verir
//   (Docker gizli bilgisi, /run/secrets/<dosya>). Değer ortam değişkeninde durmaz.
// - Bilgisayarda değer .env'den gelen <AD> ortam değişkenidir.
// Hata iletileri değeri içermez, yalnız adı ve dosya yolunu söyler.
import { readFileSync } from "node:fs";
import { dosyaEki, type GizliBilgi } from "../kayitlar/gizli-bilgiler.ts";

export const gizliBilgi = (ad: GizliBilgi): string => {
  const dosya = process.env[`${ad}${dosyaEki}`];
  if (dosya) {
    let deger: string;
    try {
      deger = readFileSync(dosya, "utf8").trim();
    } catch (hata) {
      throw new Error(`${ad} dosyası okunamadı: ${dosya}`, { cause: hata });
    }
    if (!deger) throw new Error(`${ad} dosyası boş: ${dosya}`);
    return deger;
  }
  const deger = process.env[ad];
  if (!deger) {
    throw new Error(
      `${ad} yok: ne ${ad}${dosyaEki} ne ${ad} ortam değişkeni verilmiş. Biçimi .env.example dosyasında yazar.`,
    );
  }
  return deger;
};
