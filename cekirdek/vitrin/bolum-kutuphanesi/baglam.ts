// Vitrin bağlamı (kart 0108, karar 0083): üst ve alt kısım bölümlerinin alan değerleri dışında kullandığı veri.
// Mağaza adı, logo, iletişim bilgileri ve sosyal hesaplar mağaza ayarlarından, menüler menü servisinden gelir;
// bölüm bunları kendisi okumaz, yazmaz. Vitrin bağlamı istek başına bir kez okur (cekirdek/vitrin/baglam-oku.ts),
// katalog örnek bağlamla çizer (cekirdek/katalog/ornek-baglam.ts).
//
// Bu dosya yalnız türdür ve sunucu kodu almaz: bölümlerin görünüşleri tarayıcıda da çalışır.
import type { Islev } from "../../kayitlar/islevler.ts";
import type { OdemeIsareti } from "../../kayitlar/odeme.ts";
import type { SosyalSite } from "../../kayitlar/sosyal-siteler.ts";
import type { UrunKartiVerisi } from "../urun-karti/tur.ts";
import type { BaglamBlogYazisi, BaglamYorumu, BultenKaydi } from "./islev-verisi.ts";

// Menünün vitrinde çizilecek dalı: bağlantının adresi kurulmuştur, başlığın adresi yoktur.
export type BaglamMenuDali = {
  kimlik: string;
  metin: string;
  adres?: string;
  yeniSekme: boolean;
  altlar: readonly BaglamMenuDali[];
};

// Bir görselin boyutlarının adresleri genişlikleriyle (srcset) ve orta boyutun ölçüsü (kart 0110): tarayıcı
// görsel gelmeden yerini ayırır.
export type BaglamGorseli = {
  kaynaklar: readonly { adres: string; genislik: number }[];
  genislik: number;
  yukseklik: number;
};

// Bölümlerin seçtiği kategori (kart 0110): adı, sayfasının adresi ve görselinin dosya kimliği.
export type BaglamKategorisi = { ad: string; adres: string; gorsel?: string };

// Bölümlerin seçtiği marka (kart 0111): adı, sayfasının adresi ve logosunun dosya kimliği.
export type BaglamMarkasi = { ad: string; adres: string; logo?: string };

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
  // Bu menülerden kategori ağacından gelenlerin kodları (kart 0168): telefonun yan penceresi onları tek bir
  // "Kategoriler" dalı olarak çizer.
  kategoriMenuleri: readonly string[];
  islevler: Readonly<Record<Islev, boolean>>;
  // Bölümlerin ve kategorilerin görselleri, dosya kimliğiyle (kart 0110). Silinmiş ya da boyutu olmayan görsel
  // burada yoktur; bölüm o görseli çizmez.
  gorseller: Readonly<Record<string, BaglamGorseli>>;
  // Bölümlerin seçtiği kategoriler, kimliğiyle (kart 0110). Silinmiş ya da olmayan kategori burada yoktur.
  kategoriler: Readonly<Record<string, BaglamKategorisi>>;
  // Bölümlerin seçtiği markalar, kimliğiyle (kart 0111). Silinmiş ya da olmayan marka burada yoktur.
  markalar: Readonly<Record<string, BaglamMarkasi>>;
  // Ürün bölümlerinin kaynaklarının ürün kartları, kaynağın anahtarıyla (kart 0111, urun-kaynagi.ts). Kartlar
  // urunKartlari'ndandır: yalnız vitrinde görünen ürünler, kaynağın sırasıyla.
  urunler: Readonly<Record<string, readonly UrunKartiVerisi[]>>;
  // Bağlamın okunduğu an (kart 0111): geri sayım sunucuda bu anla çizilir, tarayıcıda saatle sürer.
  an: Date;
  // İşleve bağlı bölümlerin verisi (kart 0112, islev-verisi.ts): yorumlar ve blog yazıları kaynağın anahtarıyla.
  // İşlevleri yazılana kadar boştur; bölüm zaten çizilmez.
  yorumlar: Readonly<Record<string, readonly BaglamYorumu[]>>;
  blogYazilari: Readonly<Record<string, readonly BaglamBlogYazisi[]>>;
  // Müşterinin oturumu (kart 0131): gerçek vitrinde Hesabım öğesi oturumu uçtan sorar; katalogda örnek kipte
  // istek gitmez, öğe girişsiz bağlantı olarak kalır (gerçek müşterisi yoktur, girişsiz istek konsola hata yazar).
  musteriOturumu: "sorulur" | "ornek";
  // Bülten eklentisi kurulunca kaydın gönderildiği uç; yoksa bülten bölümü çizilmez.
  bultenKaydi?: BultenKaydi;
  // Bölüm metinlerindeki yer tutucuların değerleri (kart 0110, cekirdek/kayitlar/yer-tutucular.ts).
  yerTutucular: Readonly<Record<string, string>>;
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
