// Sitenin başlangıç sayfalarını (baslangic/sayfalar.json, kart 0273) bir kez yazar. Kurallar sayfa-baslangici.ts'te.
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { sabitSayfalar } from "./model.ts";
import { sabitSayfaServisi } from "./sayfa.ts";
import { icerikKilidiAl } from "./servis.ts";

export const baslangicSayfaYazari = sistemIslemi("baslangic-sayfa");

const kuruluMu = async (vt: Veritabani | VeritabaniIslemi) =>
  (await vt.select({ kimlik: sabitSayfalar.kimlik }).from(sabitSayfalar).limit(1)).length > 0;

// Sayfalar yazıldıysa true; dosya boşsa ya da sayfalar kuruluysa false.
export const sayfaBaslangiciniKur = async (vt: Veritabani, site: Site): Promise<boolean> => {
  if (site.sayfaBaslangici.length === 0) return false;
  return vt.transaction(async (islem) => {
    await icerikKilidiAl(islem);
    if (await kuruluMu(islem)) return false;
    for (const sayfa of site.sayfaBaslangici) {
      await sabitSayfaServisi.sayfaEkle(islem, baslangicSayfaYazari, sayfa);
    }
    return true;
  });
};
