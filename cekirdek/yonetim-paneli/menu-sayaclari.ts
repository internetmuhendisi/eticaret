// Panel menüsündeki sayılar (kart 0277, karar 0174): sayfa ağacındaki sayaç kodunun sunucuda okunan değeri ve ekran
// okuyucunun okuduğu yazısı. Yalnız menüde görünen (izni olan) sayfaların sayısı okunur. Sayı okunamazsa menü
// sayısız çizilir, hata kaydedilir: panel açılmaya devam eder.
import { hatayiKaydet } from "../izleme/hata-katmani";
import type { MetinAnahtari } from "../metinler/metin";
import { onayBekleyenYorumSayisi } from "../moduller/yorum/panel-listesi";
import type { Veritabani } from "../veritabani/baglanti";
import type { MenuSayaci } from "./sayfa-agaci";

export const menuSayaciTanimlari: Record<
  MenuSayaci,
  { oku: (vt: Veritabani) => Promise<number>; yazi: MetinAnahtari }
> = {
  "onay-bekleyen-yorum": {
    oku: onayBekleyenYorumSayisi,
    yazi: "yonetim.yorumlar.menuSayisi",
  },
};

// İstenen sayaçların değerleri; okunamayan ya da sıfır olan sayaç sonuçta yoktur.
export const menuSayilariniOku = async (
  vt: Veritabani,
  sayaclar: readonly MenuSayaci[],
): Promise<Partial<Record<MenuSayaci, number>>> => {
  const sonuclar = await Promise.all(
    [...new Set(sayaclar)].map(async (sayac) => {
      try {
        return [sayac, await menuSayaciTanimlari[sayac].oku(vt)] as const;
      } catch (hata) {
        hatayiKaydet(hata, { ekran: "panel-menusu", sayac });
        return [sayac, 0] as const;
      }
    }),
  );
  return Object.fromEntries(sonuclar.filter(([, sayi]) => sayi > 0));
};
