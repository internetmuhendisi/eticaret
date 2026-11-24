// Vitrin bölümleri ekranının ve Slider kısayolunun verisi (kart 0142), sunucuda. Düzen yalnız düzen servisiyle
// okunur (panelDuzenDurumu); çizilmeme nedeninin metni burada seçilir (cizilmemeNedeniMetni). Formun seçenekleri
// gerçek kayıtlardır (duzenSecenekleri). Ekranın değişiklikleri kapıdaki düzen uçlarından gider.
//
// Vitrinde içeriği boş kaldığı için bugün çizilmeyen bölüm (kart 0172) de "vitrinde görünmüyor" işaretini ve
// türüne göre nedenini alır. Boşluk vitrinin bağlamı okunarak, görünüşün kullandığı işlevle bulunur
// (bolumBosluklari); vitrinle panel aynı kuralı kullanır.
//
// Katalog henüz kurulmadıysa (açılışın ilk saniyeleri, kart 0114) düzen okunamaz: ekran bunu söyler, sayfa düşmez.
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { hatayiKaydet } from "../../izleme/hata-katmani";
import { type DuzenAlani, duzenAlanlari } from "../../kayitlar/tema";
import type { MetinAnahtari } from "../../metinler/metin";
import { KatalogBekleniyor } from "../../moduller/duzen/baslangic";
import { duzenSecenekleri } from "../../moduller/duzen/secenekler";
import { duzenServisi } from "../../moduller/duzen/servis";
import { siteninVeritabani } from "../../veritabani/baglanti";
import { vitrinBaglaminiOku } from "../../vitrin/baglam-oku";
import { bolumBosluklari } from "../../vitrin/bolum-kutuphanesi/gorunumler";
import { bolumKutuphanesi } from "../../vitrin/bolum-kutuphanesi/kutuphane";
import type { BolumDegerleri } from "../../vitrin/bolum-kutuphanesi/tarif";
import type { BolumFormuSecenekleri } from "../bolum-formu";
import { bosBolumMetinleri, cizilmemeNedeniMetni } from "../cizilmeme-nedeni";

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
    // Vitrinin çizeceği bölümlerin bağlamı: vitrinle aynı okuma. Okunamazsa (bozuk bir mağaza ayarı gibi) ekran
    // düşmez: hata kaydedilir, boşluk bilgisi olmadan açılır (vitrin de bu durumda sayfayı sade açar; bağımsız
    // kontrolün bulgusu).
    const baglam = await vitrinBaglaminiOku(
      vt,
      calisanSite(),
      duzenAlanlari.flatMap((alan) =>
        durum.alanlar[alan].filter(({ cizilir }) => cizilir).map(({ bolum }) => bolum),
      ),
      bolumKutuphanesi,
    ).catch((hata: unknown) => {
      hatayiKaydet(hata, { kaynak: "panel-vitrin-baglami" });
      return undefined;
    });
    const bosMetni = (bolum: { tur: string; degerler: BolumDegerleri }) => {
      const tur = bolum.tur as keyof typeof bolumBosluklari;
      if (baglam === undefined || !Object.hasOwn(bolumBosluklari, tur)) return undefined;
      return bolumBosluklari[tur](bolum.degerler, baglam) ? bosBolumMetinleri[tur] : undefined;
    };
    const alanlar = Object.fromEntries(
      duzenAlanlari.map((alan) => [
        alan,
        durum.alanlar[alan].map(({ bolum, cizilir, neden }) => {
          const bos = cizilir ? bosMetni(bolum) : undefined;
          const metinAnahtari = neden === undefined ? bos : cizilmemeNedeniMetni(neden);
          return {
            ...bolum,
            cizilir: cizilir && bos === undefined,
            ...(metinAnahtari === undefined ? {} : { neden: metinAnahtari }),
          };
        }),
      ]),
    ) as Record<DuzenAlani, EkranBolumu[]>;
    return {
      durum: "hazir",
      sira: durum.sira,
      alanlar,
      secenekler,
    };
  } catch (hata) {
    if (hata instanceof KatalogBekleniyor) return { durum: "katalog-bekleniyor" };
    throw hata;
  }
};
