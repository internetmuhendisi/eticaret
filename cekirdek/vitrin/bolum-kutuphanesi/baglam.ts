// Vitrin bağlamı (kart 0108, karar 0083): üst ve alt kısım bölümlerinin alan değerleri dışında kullandığı veri.
// Mağaza adı, logo, iletişim bilgileri ve sosyal hesaplar mağaza ayarlarından, menüler menü servisinden gelir;
// bölüm bunları kendisi okumaz, yazmaz. Vitrin bağlamı istek başına bir kez okur (cekirdek/vitrin/baglam-oku.ts),
// katalog örnek bağlamla çizer (cekirdek/katalog/ornek-baglam.ts).
//
// Bu dosya yalnız türdür ve sunucu kodu almaz: bölümlerin görünüşleri tarayıcıda da çalışır.
import type { Islev } from "../../kayitlar/islevler.ts";
import type { OdemeIsareti } from "../../kayitlar/odeme.ts";
import type { SosyalSite } from "../../kayitlar/sosyal-siteler.ts";

// Menünün vitrinde çizilecek dalı: bağlantının adresi kurulmuştur, başlığın adresi yoktur.
export type BaglamMenuDali = {
  kimlik: string;
  metin: string;
  adres?: string;
  yeniSekme: boolean;
  altlar: readonly BaglamMenuDali[];
};

// İletişim bilgisinin yazılışı ve bağlantısı (tel:, mailto:).
export type IletisimBilgisi = { metin: string; adres: string };

export type VitrinBaglami = {
  magazaAdi: string;
  // Logo yoksa mağaza adı yazı olarak görünür.
  logoAdresi?: string;
  iletisim: {
    telefon?: IletisimBilgisi;
    eposta?: IletisimBilgisi;
    // Adresin satırları.
    adres?: readonly string[];
  };
  sosyalHesaplar: readonly { site: SosyalSite; adres: string }[];
  // Sitede açık ödeme yöntemlerinin işaretleri (cekirdek/kayitlar/odeme.ts).
  odemeIsaretleri: readonly OdemeIsareti[];
  // Bölümlerin seçtiği menüler, koduyla. Silinmiş ya da olmayan menü burada yoktur.
  menuler: Readonly<Record<string, readonly BaglamMenuDali[]>>;
  islevler: Readonly<Record<Islev, boolean>>;
  // Temanın parça görünümleri (cekirdek/kayitlar/tema.ts): ürün kartını çizen bölüm görünümü buradan
  // ve kendi seçiminden alır (cekirdek/vitrin/urun-karti/gorunum.ts, kart 0109).
  parcaGorunumleri: Readonly<Record<string, string>>;
  // Sepetteki ve favorilerdeki ürün sayısı; işlevleri yazılınca gelir.
  sayilar: { sepet?: number; favori?: number };
  // Telif satırının yılı: sitenin saat dilimine göre bugünün yılı.
  yil: string;
  // Vitrinde altyapı adı (altyapı sahibinin ayarı açıksa).
  altyapiAdi?: string;
};
