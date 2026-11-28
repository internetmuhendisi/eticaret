// Sitenin başlangıç sayfalarını (baslangic/sayfalar.json, kart 0273) bir kez yazar. Kurallar sayfa-baslangici.ts'te.
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri.ts";
import { magazaAdiniYerlestir } from "../../kayitlar/demo-paketi.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { magazaninAdi } from "../magaza-ayarlari/servis.ts";
import { sabitSayfalar } from "./model.ts";
import { sabitSayfaServisi } from "./sayfa.ts";
import { icerikKilidiAl } from "./servis.ts";

export const baslangicSayfaYazari = sistemIslemi("baslangic-sayfa");

const kuruluMu = async (vt: Veritabani | VeritabaniIslemi) =>
  (await vt.select({ kimlik: sabitSayfalar.kimlik }).from(sabitSayfalar).limit(1)).length > 0;

// Sayfalar yazıldıysa true; dosya boşsa ya da sayfalar kuruluysa false.
export const sayfaBaslangiciniKur = async (vt: Veritabani, site: Site): Promise<boolean> => {
  if (site.sayfaBaslangici.length === 0) return false;
  // Demo paketinin metinlerindeki yer tutucuya mağazanın adı konur (karar 0203). Ayar ilk okunurken kendi işlemiyle
  // yazılabildiği için işlemden önce okunur.
  const ad = await magazaninAdi(vt, site);
  return vt.transaction(async (islem) => {
    await icerikKilidiAl(islem);
    if (await kuruluMu(islem)) return false;
    for (const sayfa of site.sayfaBaslangici) {
      await sabitSayfaServisi.sayfaEkle(islem, baslangicSayfaYazari, {
        ...sayfa,
        baslik: magazaAdiniYerlestir(sayfa.baslik, ad),
        icerik: magazaAdiniYerlestir(sayfa.icerik, ad),
        ...(sayfa.aciklama === undefined
          ? {}
          : { aciklama: magazaAdiniYerlestir(sayfa.aciklama, ad) }),
      });
    }
    return true;
  });
};
