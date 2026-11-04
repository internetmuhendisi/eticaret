// Uygulamanın açılış kontrolü (kart 0035, karar 0026). Çalışan site açılışta bir kez okunur ve
// şemadan geçirilir. Değişken yoksa ya da klasör geçersizse sebep ölümcül seviyede günlüğe
// yazılır ve süreç kapanır; yanlış ayarla satış yapan bir site açılmaz.
import { calisanSite } from "../ayar-semasi/calisan-site.ts";
import { gunluk } from "./gunluk.ts";

export type AcilisSecenekleri = {
  siteyiOku?: () => unknown;
  kapat?: (kod: number) => void;
};

export const siteyiAcilistaDogrula = ({
  siteyiOku = calisanSite,
  kapat = (kod) => process.exit(kod),
}: AcilisSecenekleri = {}): boolean => {
  try {
    siteyiOku();
    return true;
  } catch (hata) {
    gunluk.olumcul("site açılamadı", { hata });
    kapat(1);
    return false;
  }
};
