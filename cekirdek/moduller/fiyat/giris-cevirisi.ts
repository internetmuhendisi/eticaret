// Fiyat girişinin çevirisi (kart 0326, karar 0201): bir tutarın gösterim biçimindeki hâli ve başka bir girişe (vergi
// dahil ya da hariç) çevrilmiş hâli. Vitrinin gösterimi (gosterim.ts) ve fiyat girişinin değişikliği
// (giris-degisikligi.ts) aynı işlevi kullanır: çevrilen fiyat müşteriye çevirmeden önceki gibi görünür.
//
// - Gösterim: tutar girildiği biçimden fiyatGosterimi biçimine vergi hesabıyla (vergi/hesap.ts) bir adet olarak
//   çevrilir. Vergi kapalıysa, ürün vergisizse ya da giriş gösterimle aynıysa tutar olduğu gibidir. Bölge verilmezse
//   mağaza adresi kullanılır (vitrinin ürün sayfası müşterinin adresini bilmez).
// - Başka girişe çevirme: yeni girişteki tutar, gösterimi eski girişteki tutarın gösterimiyle aynı olan tutardır.
//   Görünen tutar gösterim biçiminde girilmiş gibi yeni girişe çevrilir (gösterim yeni girişle aynıysa tutar görünen
//   tutarın kendisidir, her zaman tam); vergi yuvarlaması bazı gösterimlere hiçbir tutardan ulaştırmaz
//   (yüzde yirmide altıda biri), o tutarlarda müşterinin gördüğü fiyat 1 kuruş değişir.
import { BilinenHata } from "../../kapi/zarf.ts";
import { type HesapAyarlari, hesapla, type VergiBolgesi } from "../vergi/hesap.ts";
import type { FiyatGirisi } from "../vergi/semalar.ts";
import type { VergiSinifi } from "../vergi/servis.ts";

export type CeviriBaglami = {
  ayarlar: Omit<HesapAyarlari, "fiyatGirisi" | "vergiAdresi"> & { fiyatGosterimi: FiyatGirisi };
  // Silinmiş sınıflarıyla vergi tablosu.
  tablo: readonly VergiSinifi[];
  // Müşterinin bölgesi; yoksa mağaza adresi.
  bolge?: VergiBolgesi;
  magaza?: VergiBolgesi;
};

// Tutarın gösterim biçimi. Bölge bulunamazsa vergi hesabının bilinen hatası (is-kurali) atılır.
export const gosterimeCevir = (
  baglam: CeviriBaglami,
  tutar: number,
  sinif: string | null,
  giris: FiyatGirisi,
): number => {
  const { ayarlar } = baglam;
  if (!ayarlar.vergiAcik || sinif === null || giris === ayarlar.fiyatGosterimi) return tutar;
  const [kalem] = hesapla({
    ayarlar: {
      ...ayarlar,
      fiyatGirisi: giris,
      vergiAdresi: baglam.bolge === undefined ? "magaza" : "teslimat",
    },
    tablo: baglam.tablo,
    adresler: {
      ...(baglam.bolge === undefined ? {} : { teslimat: baglam.bolge }),
      ...(baglam.magaza === undefined ? {} : { magaza: baglam.magaza }),
    },
    satirlar: [{ birimFiyat: tutar, adet: 1, sinif }],
  }).satirlar;
  if (kalem === undefined) throw new Error("Vergi hesabı kalem döndürmedi.");
  return ayarlar.fiyatGosterimi === "vergi-dahil" ? kalem.vergili : kalem.vergisiz;
};

export type CevrilmisTutar = {
  tutar: number;
  // Müşterinin çevirmeden önce ve sonra gördüğü tutar; farklıysa en çok 1 kuruş.
  onceGorunen: number;
  sonraGorunen: number;
};

export const yeniGiriseCevir = (
  baglam: CeviriBaglami,
  tutar: number,
  sinif: string | null,
  eski: FiyatGirisi,
  yeni: FiyatGirisi,
): CevrilmisTutar => {
  const onceGorunen = gosterimeCevir(baglam, tutar, sinif, eski);
  const { ayarlar } = baglam;
  // Vergi kapalıysa ve ürün vergisizse gösterim çevirmez: aşağıdaki yol tutarı olduğu gibi bırakır.
  if (eski === yeni) return { tutar, onceGorunen, sonraGorunen: onceGorunen };
  // Görünen tutar gösterim biçiminde girilmiş gibi yeni girişe çevrilir. Tek oranlı sınıflarda (yüzde 1–20, iki yuvarlama
  // biçimi, 300 bin tutar) bu tutardan daha yakın gösterim veren bir komşu tutar yoktu (kart 0326'da ölçüldü); gösterimine
  // ulaşılamayan tutarda fark 1 kuruştur.
  const yeniTutar = gosterimeCevir(
    { ...baglam, ayarlar: { ...ayarlar, fiyatGosterimi: yeni } },
    onceGorunen,
    sinif,
    ayarlar.fiyatGosterimi,
  );
  return {
    tutar: yeniTutar,
    onceGorunen,
    sonraGorunen: gosterimeCevir(baglam, yeniTutar, sinif, yeni),
  };
};

// Fiyat girişi biçiminde tutar yazan ekranlar (kargo, ürünün fiyatları, kupon; kart 0326) gördükleri girişi gönderir:
// açık kalmış eski sayfa, giriş arada değiştiyse eski girişteki tutarı yeni girişe yazmasın. Çağıran, girişin
// değişikliğiyle sıraya giren kilidi aldıktan sonra bugünkü girişi verir; farklıysa çakışma (ekran sayfayı yeniler).
export const gorulenGirisiDenetle = (
  gorulen: FiyatGirisi | undefined,
  bugunku: FiyatGirisi,
): void => {
  if (gorulen !== undefined && gorulen !== bugunku) {
    throw new BilinenHata("cakisma", [{ alan: "fiyatGirisi", kod: "giris-degisti" }]);
  }
};
