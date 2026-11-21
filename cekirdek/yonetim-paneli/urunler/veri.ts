// Ürünler listesinin verisi (kart 0262, karar 0161), sunucuda: listenin bir sayfası biçimlenmiş satırlarla ve kayıt
// süzgeçlerinin seçenekleri. Satırın fiyatı vitrindeki kartın fiyatıdır (fiyatAraliklari: satılabilir birimlerin
// aralığı, gösterim biçiminde), stok durumu vitrinin kuralıdır (stokDurumlari, urunStokDurumu). Ürünler yalnız ürün
// servisleriyle okunur; değişiklik kapıdaki toplu uca gider.
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { type UrunDurumu, type UrunPanelStokDurumu, urunDurumVitrini } from "../../kayitlar/urun";
import { siteninBicimleyicisi } from "../../metinler/site-metni";
import { fiyatGosterimServisi } from "../../moduller/fiyat/gosterim";
import { kategorileriOku } from "../../moduller/kategori/servis";
import { kategoriYollari } from "../../moduller/kategori/yol";
import { siteninMagazaAyarlari } from "../../moduller/magaza-ayarlari/servis";
import { markaServisi } from "../../moduller/marka/servis";
import { siteninStokAyarlari, stokDurumlari } from "../../moduller/stok/durum";
import { anaGorseller } from "../../moduller/urun/galeri";
import {
  urunlerinKategoriAdlari,
  urunlerinPanelBirimleri,
  urunPanelListesi,
  urunPanelStokDurumu,
} from "../../moduller/urun/panel-listesi";
import { siteninVeritabani } from "../../veritabani/baglanti";
import type { ListeDurumu, ListeVerisi } from "../liste/tanim";
import { urunListesiGirdisi } from "./liste-tanimi";

export type UrunSatiri = {
  kimlik: string;
  ad: string;
  // Vitrindeki adresin adı: sayfası açılan üründe "Vitrinde gör" bağlantısı.
  adresAdi: string;
  // Basit üründe birimin stok kodu; varyantlı üründe birleşim sayısı (kod yok).
  stokKodu: string | null;
  birlesim: number;
  durum: UrunDurumu;
  // Zamanlanmış ürünün yayın zamanı, sitenin biçimiyle.
  yayinZamani: string | null;
  kategoriler: string[];
  // Ana görselin dosya kimliği (panel önizlemesi); görsel ya da görme izni yoksa yok.
  gorsel?: string;
  // Vitrindeki kartın fiyatı: aralık ya da tek tutar ve eski fiyat. Fiyatı olmayan üründe yok.
  fiyat: { yazi: string; eski?: string } | null;
  // Stok durumu; toplam yalnız takipli üründe, tükenen birleşim sayısı yalnız varyantlı üründe.
  stok: { durum: UrunPanelStokDurumu; toplam: number | null; tukenenBirlesim: number };
  // Ürünün sayfası şu an vitrinde açılır mı (taslak, arşiv ve zamanı gelmemiş ürün açılmaz).
  vitrinde: boolean;
};

export type UrunListesiVerisi = ListeVerisi<UrunSatiri>;
export type KayitSecenegi = { deger: string; ad: string };

export const urunListesiVerisi = async (
  durum: ListeDurumu,
  { gorselGorur }: { gorselGorur: boolean },
): Promise<UrunListesiVerisi> => {
  const site = calisanSite();
  const vt = siteninVeritabani();
  const b = siteninBicimleyicisi(site.ayarlar);
  const an = new Date();
  const [{ panelSayfaBoyu }, stokAyarlari] = await Promise.all([
    siteninMagazaAyarlari(vt, site),
    siteninStokAyarlari(vt, site),
  ]);
  const liste = await urunPanelListesi(vt, urunListesiGirdisi(durum, panelSayfaBoyu), {
    paraBirimi: stokAyarlari.paraBirimi,
    dusukStokEsigi: stokAyarlari.dusukStokEsigi,
    an,
    dil: site.ayarlar.dil,
  });
  const kimlikler = liste.satirlar.map((satir) => satir.kimlik);
  const [birimleri, kategorileri, araliklar, gorseller] = await Promise.all([
    urunlerinPanelBirimleri(vt, kimlikler),
    urunlerinKategoriAdlari(vt, kimlikler),
    fiyatGosterimServisi(site).fiyatAraliklari(vt, kimlikler, { an }),
    gorselGorur ? anaGorseller(vt, kimlikler) : Promise.resolve(new Map()),
  ]);
  const durumlar = await stokDurumlari(
    vt,
    [...birimleri.values()].flat().map((birim) => birim.kimlik),
    stokAyarlari,
  );
  return {
    satirlar: liste.satirlar.map((satir): UrunSatiri => {
      const birimler = birimleri.get(satir.kimlik) ?? [];
      const birimDurumlari = birimler.flatMap((birim) => {
        const bulunan = durumlar.get(birim.kimlik);
        return bulunan === undefined ? [] : [bulunan];
      });
      const takipli = birimDurumlari.some((birim) => birim.takip);
      const varyantli = birimler.some((birim) => birim.birlesim !== "");
      const aralik = araliklar.get(satir.kimlik);
      const gorsel = gorseller.get(satir.kimlik);
      const { sayfa, zamanli } = urunDurumVitrini[satir.durum];
      return {
        kimlik: satir.kimlik,
        ad: satir.ad,
        adresAdi: satir.adresAdi,
        stokKodu: varyantli ? null : (birimler[0]?.stokKodu ?? null),
        birlesim: varyantli ? birimler.length : 0,
        durum: satir.durum,
        yayinZamani: zamanli && satir.yayinZamani !== null ? b.tarihSaat(satir.yayinZamani) : null,
        kategoriler: kategorileri.get(satir.kimlik) ?? [],
        ...(gorsel === undefined ? {} : { gorsel: gorsel.dosya }),
        fiyat:
          aralik === undefined
            ? null
            : aralik.tek
              ? {
                  yazi: aralik.enDusuk.yazili.tutar,
                  ...(aralik.enDusuk.yazili.eskiTutar === undefined
                    ? {}
                    : { eski: aralik.enDusuk.yazili.eskiTutar }),
                }
              : { yazi: aralik.yaziliAralik },
        stok: {
          durum: urunPanelStokDurumu(birimDurumlari),
          toplam: takipli
            ? birimDurumlari.reduce((toplam, birim) => toplam + birim.miktar, 0)
            : null,
          tukenenBirlesim: varyantli ? birimDurumlari.filter((birim) => birim.tukendi).length : 0,
        },
        vitrinde:
          sayfa &&
          !(zamanli && (satir.yayinZamani === null || satir.yayinZamani.getTime() > an.getTime())),
      };
    }),
    toplam: liste.toplam,
    sayfa: liste.sayfa,
    sayfaSayisi: liste.sayfaSayisi,
    sayfaBoyu: liste.sayfaBoyu,
    sekmeSayilari: {},
  };
};

// Kayıt süzgeçlerinin seçenekleri: kategoriler ağaç sırasında yollarıyla ("Kadın › Tişört"), markalar ada göre.
export const urunSuzgecSecenekleri = async (): Promise<Record<string, KayitSecenegi[]>> => {
  const vt = siteninVeritabani();
  const [kategoriler, markalar] = await Promise.all([
    kategorileriOku(vt),
    markaServisi.hepsiniOku(vt),
  ]);
  return {
    kategori: kategoriYollari(kategoriler).map(({ kimlik, ad }) => ({ deger: kimlik, ad })),
    marka: markalar.map(({ kimlik, ad }) => ({ deger: kimlik, ad })),
  };
};
