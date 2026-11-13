// Vitrin bölümleri ekranının ve Slider kısayolunun verisi (kart 0142), sunucuda. Düzen yalnız düzen servisiyle
// okunur (panelDuzenDurumu); çizilmeme nedeninin metni burada seçilir (cizilmemeNedeniMetni). Formun seçenekleri
// gerçek kayıtlardır (duzenSecenekleri). Ekranın değişiklikleri kapıdaki düzen uçlarından gider.
//
// Katalog henüz kurulmadıysa (açılışın ilk saniyeleri, kart 0114) düzen okunamaz: ekran bunu söyler, sayfa düşmez.
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { type DuzenAlani, duzenAlanlari } from "../../kayitlar/tema";
import type { MetinAnahtari } from "../../metinler/metin";
import { KatalogBekleniyor } from "../../moduller/duzen/baslangic";
import { duzenSecenekleri } from "../../moduller/duzen/secenekler";
import { duzenServisi } from "../../moduller/duzen/servis";
import { siteninVeritabani } from "../../veritabani/baglanti";
import type { BolumDegerleri } from "../../vitrin/bolum-kutuphanesi/tarif";
import type { BolumFormuSecenekleri } from "../bolum-formu";
import { cizilmemeNedeniMetni } from "../cizilmeme-nedeni";

export type EkranBolumu = {
  kimlik: string;
  tur: string;
  gorunum: string;
  gizli: boolean;
  degerler: BolumDegerleri;
  cizilir: boolean;
  // Vitrinde çizilmiyorsa nedeninin metni.
  neden?: MetinAnahtari;
};

export type BolumlerEkraniVerisi =
  | {
      durum: "hazir";
      // Geçerli düzen sürümünün sırası: 1 ise dönülecek önceki hâl yoktur.
      sira: number;
      alanlar: Record<DuzenAlani, EkranBolumu[]>;
      secenekler: BolumFormuSecenekleri;
    }
  | { durum: "katalog-bekleniyor" };

export const bolumlerEkraniVerisi = async (): Promise<BolumlerEkraniVerisi> => {
  const vt = siteninVeritabani();
  try {
    const [durum, secenekler] = await Promise.all([
      duzenServisi(calisanSite).panelDuzenDurumu(vt),
      duzenSecenekleri(vt),
    ]);
    const alanlar = Object.fromEntries(
      duzenAlanlari.map((alan) => [
        alan,
        durum.alanlar[alan].map(({ bolum, cizilir, neden }) => ({
          ...bolum,
          cizilir,
          ...(neden === undefined ? {} : { neden: cizilmemeNedeniMetni(neden) }),
        })),
      ]),
    ) as Record<DuzenAlani, EkranBolumu[]>;
    return {
      durum: "hazir",
      sira: durum.sira,
      alanlar,
      // Blog işlevi yazılana kadar blog kategorisi yoktur (kart 0112).
      secenekler: { ...secenekler, blogKategorileri: [] },
    };
  } catch (hata) {
    if (hata instanceof KatalogBekleniyor) return { durum: "katalog-bekleniyor" };
    throw hata;
  }
};
