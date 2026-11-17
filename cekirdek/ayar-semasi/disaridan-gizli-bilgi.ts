// Dışarıdan gelen gizli bilgiyi okuyan tek yer (kart 0215, karar 0142; kayıt cekirdek/kayitlar/disaridan-gizli-bilgiler.ts).
// Sunucuda değer dosyadadır, bilgisayarda ortam değişkenidir. Değer yoksa undefined: hizmet o sitede kullanılamaz.
// Dosya verilmiş ama okunamıyorsa hatadır (yanlış kurulum sessiz kalmasın). Hata iletisi değeri içermez.
import { readFileSync } from "node:fs";
import {
  type DisaridanGizliBilgi,
  disaridanGizliBilgiler,
} from "../kayitlar/disaridan-gizli-bilgiler.ts";

export const disaridanGizliBilgi = (ad: DisaridanGizliBilgi): string | undefined => {
  const dosya = process.env[disaridanGizliBilgiler[ad].dosyaDegiskeni];
  if (dosya) {
    let deger: string;
    try {
      deger = readFileSync(dosya, "utf8").trim();
    } catch (hata) {
      throw new Error(`${ad} dosyası okunamadı: ${dosya}`, { cause: hata });
    }
    return deger === "" ? undefined : deger;
  }
  const deger = process.env[ad]?.trim();
  return deger === undefined || deger === "" ? undefined : deger;
};
