// Vitrinin adresleri (kart 0033; kart 0108). Adres dosyaları cekirdek/uygulama/app/(vitrin)/ altındadır.
//
// Arama, sepet, favoriler ve kategori, marka, ürün sayfaları Vitrin bölümünün kartlarıyla yazılır (karar 0083).
// Adresleri burada tek yerde tanımlıdır: menü ve üst kısım bağlantıyı buradan kurar. Arama, sepet ve favori
// düğmeleri ilgili işlev yazılana kadar görünmez (cekirdek/kayitlar/islevler.ts). Kategori, marka, etiket ve
// ürün sayfasının iskeleti kart 0135'te açıldı; içeriği kartlar 0136 ve 0138'de gelir.
import type { AdresliKayitTuru } from "../kayitlar/adres";
import { siparisErisimCerezi, siparisTakipCerezi } from "../kayitlar/siparis.ts";

export const vitrinAdresleri = {
  anasayfa: "/",
  giris: "/giris",
  kayit: "/kayit",
  sifremiUnuttum: "/sifremi-unuttum",
  sifreYenile: "/sifre-yenile",
  uyelikSozlesmesi: "/yasal/uyelik-sozlesmesi",
  kvkkAydinlatma: "/yasal/kvkk-aydinlatma",
  arama: "/arama",
  sepet: "/sepet",
  // Ödeme adımı (kart 0213): vitrinin çerçevesinin dışında, sade üst ve alt kısımla.
  odeme: "/odeme",
  // Sipariş alındı sayfası (kart 0214): erişim çerezi yalnız bu yola gider, adres tek yerde.
  siparisAlindi: siparisErisimCerezi.yol,
  // Havale bildirimi (kart 0214).
  havaleBildirimi: "/havale-bildirimi",
  // Üye olmayanın sipariş takibi (kart 0238): takip çerezi yalnız bu yola gider, adres tek yerde.
  siparisTakibi: siparisTakipCerezi.yol,
  // Üye olmayanın iade talebi (kart 0239): takip çerezinin yolunun altında, takip ettiği siparişin talebi.
  takipIadeTalebi: `${siparisTakipCerezi.yol}/iade-talebi`,
  favoriler: "/favoriler",
  // Hesabım (kart 0237, karar 0149): girişli müşterinin sayfaları. Hesabın açılış sayfası hesapIlkSayfasi'dır.
  hesabim: "/hesabim",
  hesapSiparisleri: "/hesabim/siparislerim",
  hesapAdresleri: "/hesabim/adreslerim",
  hesapFavorileri: "/hesabim/favorilerim",
  hesapBilgileri: "/hesabim/hesap-bilgileri",
  // Blog (kart 0272): yazıların listesi; yazının sayfası kayitAdresleri["blog-yazisi"].
  blog: "/blog",
} as const;

// Blog listesinin adresi (kart 0272): kategori adres adıyla ve sayfa adreste durur; ilk sayfa yazılmaz.
export const blogListesiAdresi = ({
  kategori,
  sayfa = 1,
}: {
  kategori?: string | undefined;
  sayfa?: number;
}): string => {
  const parametreler = new URLSearchParams();
  if (kategori !== undefined) parametreler.set("kategori", kategori);
  if (sayfa > 1) parametreler.set("sayfa", String(sayfa));
  const sorgu = parametreler.toString();
  return sorgu === "" ? vitrinAdresleri.blog : `${vitrinAdresleri.blog}?${sorgu}`;
};

// Hesabın açılış sayfası: girişten sonra ve /hesabim adresinde açılır. Karar 0145'e göre Siparişlerim'dir (kart 0238).
export const hesapIlkSayfasi = vitrinAdresleri.hesapSiparisleri;

// Hesaptaki bir siparişin ayrıntısı ve takip sayfasının numaralı adresi (kart 0238). Numara kalıba uyan büyük harfli
// yazılıştır ("ORN-1001"); takip sayfası numarayı yalnız formu doldurmak için okur.
export const hesapSiparisiAdresi = (numara: string): string =>
  `${vitrinAdresleri.hesapSiparisleri}/${encodeURIComponent(numara)}`;
// Hesaptaki siparişin iade talebi sayfası (kart 0239).
export const hesapIadeTalebiAdresi = (numara: string): string =>
  `${hesapSiparisiAdresi(numara)}/iade-talebi`;
export const siparisTakibiAdresi = (numara: string): string =>
  `${vitrinAdresleri.siparisTakibi}?${new URLSearchParams({ siparis: numara })}`;

// Kaydın vitrindeki sayfası, adres adıyla (kart 0135: etiket). Türler cekirdek/kayitlar/adres.ts kaydındadır;
// eksik ya da fazla tür tür kontrolünde hatadır. Adres adı değişen kaydın eski adresi yenisine kalıcı olarak
// yönlenir (cekirdek/moduller/gorunurluk/adres.ts, karar 0103).
export const kayitAdresleri = {
  kategori: (adresAdi: string) => `/kategori/${adresAdi}`,
  marka: (adresAdi: string) => `/marka/${adresAdi}`,
  etiket: (adresAdi: string) => `/etiket/${adresAdi}`,
  urun: (adresAdi: string) => `/urun/${adresAdi}`,
  // Kart 0272: blog yazısı.
  "blog-yazisi": (adresAdi: string) => `/blog/${adresAdi}`,
  // Kart 0273: sabit sayfa. Önek sayfa adlarını ürün, kategori ve sistem adresleriyle çakıştırmaz (karar 0157).
  sayfa: (adresAdi: string) => `/sayfa/${adresAdi}`,
} as const satisfies Record<AdresliKayitTuru, (adresAdi: string) => string>;

// Müşteri girişinden sonra dönülecek adres (kart 0139: yorum yazmak için girişe giden müşteri ürüne döner).
// Yalnız vitrinin kendi sayfasına dönülür: başka siteye, panele, kapıya ve giriş sayfasının kendisine dönülmez;
// geçersiz değer ana sayfadır. Panelin kuralıyla aynı yol (cekirdek/yonetim-paneli/adresler.ts, guvenliDonus).
export const vitrinDonusParametresi = "donus";
const cozumKoku = "http://vitrin.invalid";
const donulmeyenler = ["/yonetim", "/kapi", "/gelistirme", vitrinAdresleri.giris];

export const vitrinDonusu = (deger: string | null | undefined): string => {
  if (!deger?.startsWith("/") || deger.startsWith("//") || deger.includes("\\")) {
    return vitrinAdresleri.anasayfa;
  }
  let adres: URL;
  try {
    adres = new URL(deger, cozumKoku);
  } catch {
    return vitrinAdresleri.anasayfa;
  }
  const { origin, pathname, search, hash } = adres;
  // Kodlanmış yazılış ("/y%6Fnetim") da çözülerek karşılaştırılır; çözülemeyen yol ana sayfadır.
  let cozulmus: string;
  try {
    cozulmus = decodeURIComponent(pathname).toLowerCase();
  } catch {
    return vitrinAdresleri.anasayfa;
  }
  const yasak = donulmeyenler.some((kok) => cozulmus === kok || cozulmus.startsWith(`${kok}/`));
  if (origin !== cozumKoku || yasak) return vitrinAdresleri.anasayfa;
  return `${pathname}${search}${hash}`;
};

export const girisAdresiDonuslu = (donus: string): string =>
  `${vitrinAdresleri.giris}?${new URLSearchParams({ [vitrinDonusParametresi]: donus })}`;

// Girişten kayda geçen müşterinin dönüş adresi kayda taşınır (kart 0237): kayıttan sonra geldiği sayfaya döner.
export const kayitAdresiDonuslu = (donus: string | undefined): string =>
  donus === undefined
    ? vitrinAdresleri.kayit
    : `${vitrinAdresleri.kayit}?${new URLSearchParams({ [vitrinDonusParametresi]: donus })}`;
