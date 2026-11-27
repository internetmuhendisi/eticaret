// Panelin sayfa ağacı (kart 0141, karar 0111): her panel sayfası burada bir kez yazılır. Ana menü, sayfa yolu,
// sayfa başlığı ve sekme başlığı buradan üretilir; menüye ve sayfaya izin de buradan bakılır. Yeni panel ekranı
// önce buraya eklenir, sonra `app/yonetim/(panel)/` altına yazılır ve PanelSayfasi'na kendi kodunu verir.
// Ekranı yazılmamış sayfa ağaca girmez: menüdeki bağlantı bulunamadı sayfasına gitmesin.
import type { PanelIkonAdi } from "../../bilesenler/ikonlar/panel-sozlugu";
import type { EklentiKodu } from "../kayitlar/eklentiler";
import type { GirisIzni } from "../kayitlar/izinler";
import type { MetinAnahtari } from "../metinler/metin";
import {
  blogAdresi,
  blogKategorileriAdresi,
  ekipAdresi,
  ekipRolleriAdresi,
  epostalarAdresi,
  hesabimAdresi,
  magazaBilgileriAdresi,
  menulerAdresi,
  panelAdresi,
  raporlarAdresi,
  sayfalarAdresi,
  temaAdresi,
  temaAyarlariAdresi,
  vergiEkraniAdresi,
  yorumlarAdresi,
} from "./adresler";

// Menüdeki gruplar, menüdeki sırasıyla. Grubun adı yalnız menüde görünür; grubun kendi sayfası yoktur.
export const panelGruplari = {
  satis: "yonetim.grup.satis",
  urunler: "yonetim.grup.urunler",
  vitrin: "yonetim.grup.vitrin",
  // Kart 0272: blog; kart 0273: sabit sayfalar.
  icerik: "yonetim.grup.icerik",
  // Kart 0274: ekip ve kendi hesabı; kart 0301: mağaza bilgileri, sipariş ayarları, ödeme, kargo.
  ayarlar: "yonetim.grup.ayarlar",
} as const satisfies Record<string, MetinAnahtari>;
export type PanelGrubu = keyof typeof panelGruplari;

export type PanelSayfaTanimi = {
  kod: string;
  adres: string;
  // Menüde, sayfa yolunda, başlıkta ve sekmede görünen ad.
  ad: MetinAnahtari;
  // Komut çubuğunda başlığın altındaki bir iki cümle.
  aciklama: MetinAnahtari;
  ikon: PanelIkonAdi;
  // Sayfayı görmek için gereken izin; null ise her yönetici görür.
  izin: GirisIzni<"yonetici"> | null;
  // Menüde hangi grubun altında durduğu; null ise grupsuz, en üstte.
  grup: PanelGrubu | null;
  // Bir alt sayfa (form, detay) menüde görünmez, sayfa yolunda üstünün altında durur.
  ust?: string;
  // Menüde adın yanındaki küçük işaret, örneğin "Kısayol" (kart 0142, taslak).
  isaret?: MetinAnahtari;
  // Menüde adın yanındaki sayı (kart 0277): bakılması gereken kayıtların sayısı (onay bekleyen yorum). Sayıyı
  // sunucu menu-sayaclari.ts ile okur; sıfırsa görünmez.
  sayac?: MenuSayaci;
  // Sayfayı getiren eklenti (kart 0144, karar 0117): eklenti sitede kapalıysa sayfa menüde yoktur ve açılmaz.
  eklenti?: EklentiKodu;
};

// Menüdeki sayıların kodları; okuyan işlevler ve metinleri menu-sayaclari.ts'tedir.
export const menuSayaclari = ["onay-bekleyen-yorum"] as const;
export type MenuSayaci = (typeof menuSayaclari)[number];

// Sıra menüdeki sıradır. İlk sayfa panelin kökü ve girişten sonraki açılış sayfasıdır; sayfa yolu onunla başlar.
export const panelSayfalari = [
  {
    kod: "karsilama",
    adres: panelAdresi,
    ad: "yonetim.sayfa.karsilama.ad",
    aciklama: "yonetim.sayfa.karsilama.aciklama",
    ikon: "ev",
    izin: null,
    grup: null,
  },
  // Raporlar (kart 0317, karar 0195; taslak: panel-2.html "Raporlar"): grupsuz, Karşılama'dan sonra. Yalnız mağaza
  // sahibi görür (rapor.gor).
  {
    kod: "raporlar",
    adres: raporlarAdresi,
    ad: "yonetim.sayfa.raporlar.ad",
    aciklama: "yonetim.sayfa.raporlar.aciklama",
    ikon: "rapor",
    izin: "rapor.gor",
    grup: null,
  },
  // Siparişler (kart 0234, karar 0145): görevli görür ve yönetir, havaleyi yalnız mağaza sahibi onaylar. Ayrıntı alt
  // sayfadır: numara adresin sorgusundadır (?numara=), sayfa yolunda listenin altında durur.
  {
    kod: "siparisler",
    adres: `${panelAdresi}/siparisler`,
    ad: "yonetim.sayfa.siparisler.ad",
    aciklama: "yonetim.sayfa.siparisler.aciklama",
    ikon: "paket",
    izin: "siparis.gor",
    grup: "satis",
  },
  {
    kod: "siparis-ayrintisi",
    adres: `${panelAdresi}/siparisler/ayrinti`,
    ad: "yonetim.sayfa.siparisAyrintisi.ad",
    aciklama: "yonetim.sayfa.siparisAyrintisi.aciklama",
    ikon: "paket",
    izin: "siparis.gor",
    grup: "satis",
    ust: "siparisler",
  },
  // Sipariş fişi (kart 0270, karar 0171): bir ya da birden çok siparişin yazdırılacak fişi (?numara=A,B); görevli de
  // yazdırır. Yazdırırken panelin çerçevesi ve komut çubuğu gizlenir.
  {
    kod: "siparis-fisi",
    adres: `${panelAdresi}/siparisler/fis`,
    ad: "yonetim.sayfa.siparisFisi.ad",
    aciklama: "yonetim.sayfa.siparisFisi.aciklama",
    ikon: "yazici",
    izin: "siparis.gor",
    grup: "satis",
    ust: "siparisler",
  },
  // Elle sipariş (kart 0236, karar 0148): telefonla ya da yüz yüze alınan sipariş; görevli de girer.
  {
    kod: "elle-siparis",
    adres: `${panelAdresi}/siparisler/elle`,
    ad: "yonetim.sayfa.elleSiparis.ad",
    aciklama: "yonetim.sayfa.elleSiparis.aciklama",
    ikon: "ekle",
    izin: "siparis.yonet",
    grup: "satis",
    ust: "siparisler",
  },
  // Müşteriler (kart 0271, karar 0173): yalnız üyeler; liste ve ayrıntı kişisel veridir (musteri.gor, görevlide yok).
  {
    kod: "musteriler",
    adres: `${panelAdresi}/musteriler`,
    ad: "yonetim.sayfa.musteriler.ad",
    aciklama: "yonetim.sayfa.musteriler.aciklama",
    ikon: "hesap",
    izin: "musteri.gor",
    grup: "satis",
  },
  {
    kod: "musteri-ayrintisi",
    adres: `${panelAdresi}/musteriler/ayrinti`,
    ad: "yonetim.sayfa.musteriAyrintisi.ad",
    aciklama: "yonetim.sayfa.musteriAyrintisi.aciklama",
    ikon: "hesap",
    izin: "musteri.gor",
    grup: "satis",
    ust: "musteriler",
  },
  // Kuponlar (kart 0313, karar 0188): görevli ve sipariş görevlisi görür; açmak, değiştirmek ve kapatmak mağaza
  // sahibinindir (kupon.degistir). Kuponun sayfası (kullanımları) ve düzenleme alt sayfadır (?kimlik=).
  {
    kod: "kuponlar",
    adres: `${panelAdresi}/kuponlar`,
    ad: "yonetim.sayfa.kuponlar.ad",
    aciklama: "yonetim.sayfa.kuponlar.aciklama",
    ikon: "kupon",
    izin: "kupon.gor",
    grup: "satis",
  },
  {
    kod: "yeni-kupon",
    adres: `${panelAdresi}/kuponlar/yeni`,
    ad: "yonetim.sayfa.yeniKupon.ad",
    aciklama: "yonetim.sayfa.yeniKupon.aciklama",
    ikon: "ekle",
    izin: "kupon.degistir",
    grup: "satis",
    ust: "kuponlar",
  },
  {
    kod: "kupon",
    adres: `${panelAdresi}/kuponlar/kupon`,
    ad: "yonetim.sayfa.kupon.ad",
    aciklama: "yonetim.sayfa.kupon.aciklama",
    ikon: "kupon",
    izin: "kupon.gor",
    grup: "satis",
    ust: "kuponlar",
  },
  {
    kod: "kupon-duzenle",
    adres: `${panelAdresi}/kuponlar/duzenle`,
    ad: "yonetim.sayfa.kuponDuzenle.ad",
    aciklama: "yonetim.sayfa.kuponDuzenle.aciklama",
    ikon: "duzenle",
    izin: "kupon.degistir",
    grup: "satis",
    ust: "kuponlar",
  },
  // Slider kısayolu (kart 0142, karar 0101): ana sayfadaki ilk kayan afişin formu. Kayıtta düzeni değiştirir.
  {
    kod: "slider",
    adres: `${panelAdresi}/slider`,
    // Ad bölümün kendi adıdır (tek yerde, karar 0101): kayan afiş panelde "Slider".
    ad: "vitrin.bolum.kayanAfis.ad",
    aciklama: "yonetim.sayfa.sliderAciklamasi",
    ikon: "slider",
    izin: "duzen.degistir",
    grup: "vitrin",
    isaret: "yonetim.cerceve.kisayol",
  },
  // Ürünler listesi (kart 0262, karar 0161): ürün yönetiminin girişi. Görevli görür, yayınlar, taslağa ve arşive
  // alır, silemez.
  {
    kod: "urunler",
    adres: `${panelAdresi}/urunler`,
    ad: "yonetim.sayfa.urunler.ad",
    aciklama: "yonetim.sayfa.urunler.aciklama",
    ikon: "urunler",
    izin: "urun.gor",
    grup: "urunler",
  },
  // Ürün ekranı (kart 0263, karar 0162): yeni ürün ve var olan ürün (kimlik adresin sorgusunda, ?kimlik=); sayfa
  // yolunda listenin altında durur.
  {
    kod: "yeni-urun",
    adres: `${panelAdresi}/urunler/yeni`,
    ad: "yonetim.sayfa.yeniUrun.ad",
    aciklama: "yonetim.sayfa.yeniUrun.aciklama",
    ikon: "ekle",
    izin: "urun.degistir",
    grup: "urunler",
    ust: "urunler",
  },
  // Excel ile toplu ürün işlemleri eklentisi (kart 0315): dışa aktarma ürünleri görene açıktır; içe aktarma ekranda
  // ürünü değiştirme izniyle görünür, uçlar da onu ister.
  {
    kod: "urunler-excel",
    adres: `${panelAdresi}/urunler/excel`,
    ad: "yonetim.sayfa.urunlerExcel.ad",
    aciklama: "yonetim.sayfa.urunlerExcel.aciklama",
    ikon: "yukle",
    izin: "urun.gor",
    grup: "urunler",
    ust: "urunler",
    eklenti: "excel-ile-toplu-urun-islemleri",
  },
  {
    kod: "urun",
    adres: `${panelAdresi}/urunler/urun`,
    ad: "yonetim.sayfa.urun.ad",
    aciklama: "yonetim.sayfa.urun.aciklama",
    ikon: "urunler",
    izin: "urun.gor",
    grup: "urunler",
    ust: "urunler",
  },
  // Kategoriler, markalar ve etiketler, özellikler (kart 0261, karar 0160): ürünün gruplandığı kayıtlar. Görevli
  // görür ve değiştirir, silemez (izinlerin kararı).
  {
    kod: "kategoriler",
    adres: `${panelAdresi}/kategoriler`,
    ad: "yonetim.sayfa.kategoriler.ad",
    aciklama: "yonetim.sayfa.kategoriler.aciklama",
    ikon: "kategoriler",
    izin: "kategori.gor",
    grup: "urunler",
  },
  {
    kod: "markalar",
    adres: `${panelAdresi}/markalar`,
    ad: "yonetim.sayfa.markalar.ad",
    aciklama: "yonetim.sayfa.markalar.aciklama",
    ikon: "markalar",
    izin: "marka.gor",
    grup: "urunler",
  },
  {
    kod: "ozellikler",
    adres: `${panelAdresi}/ozellikler`,
    ad: "yonetim.sayfa.ozellikler.ad",
    aciklama: "yonetim.sayfa.ozellikler.aciklama",
    ikon: "ozellikler",
    izin: "ozellik.gor",
    grup: "urunler",
  },
  // Yorumlar (kart 0277, karar 0174): onay bekleyen, yayındaki ve reddedilen yorumlar; görevli de görür ve karar
  // verir. Menüde onay bekleyen yorum sayısı görünür.
  {
    kod: "yorumlar",
    adres: yorumlarAdresi,
    ad: "yonetim.sayfa.yorumlar.ad",
    aciklama: "yonetim.sayfa.yorumlar.aciklama",
    ikon: "yorumlar",
    izin: "yorum.gor",
    grup: "urunler",
    sayac: "onay-bekleyen-yorum",
  },
  // Stoğa gelince haber ver eklentisi (kart 0144, karar 0117): bekleyen talepler stok bilgisidir, stok.gor ister.
  {
    kod: "stok-bildirimleri",
    adres: `${panelAdresi}/stok-bildirimleri`,
    ad: "yonetim.sayfa.stokBildirimleri.ad",
    aciklama: "yonetim.sayfa.stokBildirimleri.aciklama",
    ikon: "eposta",
    izin: "stok.gor",
    grup: "urunler",
    eklenti: "stoga-gelince-haber-ver",
  },
  {
    kod: "vitrin-bolumleri",
    adres: `${panelAdresi}/vitrin-bolumleri`,
    ad: "yonetim.sayfa.vitrinBolumleri.ad",
    aciklama: "yonetim.sayfa.vitrinBolumleri.aciklama",
    ikon: "bolumler",
    izin: "duzen.gor",
    grup: "vitrin",
  },
  {
    kod: "menuler",
    adres: menulerAdresi,
    ad: "yonetim.sayfa.menuler.ad",
    aciklama: "yonetim.sayfa.menuler.aciklama",
    ikon: "menuler",
    izin: "menu.gor",
    grup: "vitrin",
  },
  // Tema ekranı (kart 0148, karar 0101): temalar, demoları, seçim ve geri dönüş.
  {
    kod: "tema",
    adres: temaAdresi,
    ad: "yonetim.sayfa.tema.ad",
    aciklama: "yonetim.sayfa.tema.aciklama",
    ikon: "tema",
    izin: "tema.gor",
    grup: "vitrin",
  },
  // Tema ayarları (kart 0260, karar 0168): logo, renkler, yazı tipi, köşe ve düğme, koyu tema, filtrenin yeri.
  {
    kod: "tema-ayarlari",
    adres: temaAyarlariAdresi,
    ad: "yonetim.sayfa.temaAyarlari.ad",
    aciklama: "yonetim.sayfa.temaAyarlari.aciklama",
    ikon: "tema",
    izin: "tema.gor",
    grup: "vitrin",
    ust: "tema",
  },
  // Blog (kart 0272, karar 0176): yazılar, yeni yazı, yazının ekranı (?kimlik=) ve blog kategorileri. Görmek icerik.gor,
  // yazmak icerik.degistir; blogun açık olması mağaza ayarıdır (anahtar listenin üstünde).
  {
    kod: "blog",
    adres: blogAdresi,
    ad: "yonetim.sayfa.blog.ad",
    aciklama: "yonetim.sayfa.blog.aciklama",
    ikon: "yazi",
    izin: "icerik.gor",
    grup: "icerik",
  },
  {
    kod: "yeni-blog-yazisi",
    adres: `${blogAdresi}/yeni`,
    ad: "yonetim.sayfa.yeniBlogYazisi.ad",
    aciklama: "yonetim.sayfa.yeniBlogYazisi.aciklama",
    ikon: "ekle",
    izin: "icerik.degistir",
    grup: "icerik",
    ust: "blog",
  },
  {
    kod: "blog-yazisi",
    adres: `${blogAdresi}/yazi`,
    ad: "yonetim.sayfa.blogYazisi.ad",
    aciklama: "yonetim.sayfa.blogYazisi.aciklama",
    ikon: "yazi",
    izin: "icerik.gor",
    grup: "icerik",
    ust: "blog",
  },
  {
    kod: "blog-kategorileri",
    adres: blogKategorileriAdresi,
    ad: "yonetim.sayfa.blogKategorileri.ad",
    aciklama: "yonetim.sayfa.blogKategorileri.aciklama",
    ikon: "kategoriler",
    izin: "icerik.gor",
    grup: "icerik",
    ust: "blog",
  },
  // Sabit sayfalar (kart 0273): liste, yeni sayfa ve sayfanın ekranı (?kimlik=). İzinler blogunkilerdir (icerik.*).
  {
    kod: "sayfalar",
    adres: sayfalarAdresi,
    ad: "yonetim.sayfa.sayfalar.ad",
    aciklama: "yonetim.sayfa.sayfalar.aciklama",
    ikon: "sayfa",
    izin: "icerik.gor",
    grup: "icerik",
  },
  {
    kod: "yeni-sayfa",
    adres: `${sayfalarAdresi}/yeni`,
    ad: "yonetim.sayfa.yeniSayfa.ad",
    aciklama: "yonetim.sayfa.yeniSayfa.aciklama",
    ikon: "ekle",
    izin: "icerik.degistir",
    grup: "icerik",
    ust: "sayfalar",
  },
  {
    kod: "sabit-sayfa",
    adres: `${sayfalarAdresi}/sayfa`,
    ad: "yonetim.sayfa.sabitSayfa.ad",
    aciklama: "yonetim.sayfa.sabitSayfa.aciklama",
    ikon: "sayfa",
    izin: "icerik.gor",
    grup: "icerik",
    ust: "sayfalar",
  },
  // Ayarlar (kart 0301, taslak karar 0157): mağaza bilgileri, sipariş ayarları, ödeme yöntemleri ve banka hesapları,
  // kargo, ekip ve yöneticinin kendi hesabı; sıra taslağınkidir, banka hesapları ödeme yöntemlerinin yanında.
  // Mağaza bilgileri (kart 0278, karar 0175): mağaza adı, iletişim, adres, sosyal hesaplar ve satıcı bilgileri. Mağaza
  // ayarlarıdır, yalnız mağaza sahibinin izinleriyle.
  {
    kod: "magaza-bilgileri",
    adres: magazaBilgileriAdresi,
    ad: "yonetim.sayfa.magazaBilgileri.ad",
    aciklama: "yonetim.sayfa.magazaBilgileri.aciklama",
    ikon: "magaza",
    izin: "magaza-ayarlari.gor",
    grup: "ayarlar",
  },
  // Sipariş ayarları (kart 0234): kargo firmaları; mağaza ayarıdır, yalnız mağaza sahibinin izinleriyle.
  {
    kod: "siparis-ayarlari",
    adres: `${panelAdresi}/siparis-ayarlari`,
    ad: "yonetim.sayfa.siparisAyarlari.ad",
    aciklama: "yonetim.sayfa.siparisAyarlari.aciklama",
    ikon: "duzenle",
    izin: "magaza-ayarlari.gor",
    grup: "ayarlar",
  },
  // Ödeme yöntemleri ve banka hesapları (kart 0214, karar 0141): görevli görür, yalnız mağaza sahibi değiştirir.
  {
    kod: "odeme-yontemleri",
    adres: `${panelAdresi}/odeme-yontemleri`,
    ad: "yonetim.sayfa.odemeYontemleri.ad",
    aciklama: "yonetim.sayfa.odemeYontemleri.aciklama",
    ikon: "kart",
    izin: "odeme-yontemi.gor",
    grup: "ayarlar",
  },
  {
    kod: "banka-hesaplari",
    adres: `${panelAdresi}/banka-hesaplari`,
    ad: "yonetim.sayfa.bankaHesaplari.ad",
    aciklama: "yonetim.sayfa.bankaHesaplari.aciklama",
    ikon: "havale",
    izin: "odeme-yontemi.gor",
    grup: "ayarlar",
  },
  // Kargo ayarları (kart 0212, karar 0135): mağaza ayarlarıdır, yalnız mağaza sahibinin izinleriyle.
  {
    kod: "kargo",
    adres: `${panelAdresi}/kargo`,
    ad: "yonetim.sayfa.kargo.ad",
    aciklama: "yonetim.sayfa.kargo.aciklama",
    ikon: "kargo",
    izin: "magaza-ayarlari.gor",
    grup: "ayarlar",
  },
  // Vergi (kart 0322): genel ayarlar, sınıflar ve oranlar. Görmek vergi.gor, değiştirmek vergi.degistir (yalnız mağaza
  // sahibi); fiyat girişi burada yalnız gösterilir (kart 0326).
  {
    kod: "vergi",
    adres: vergiEkraniAdresi,
    ad: "yonetim.sayfa.vergi.ad",
    aciklama: "yonetim.sayfa.vergi.aciklama",
    ikon: "vergi",
    izin: "vergi.gor",
    grup: "ayarlar",
  },
  // E-postalar (kart 0279, karar 0197): gönderen adı, yanıt adresi, alt bilgiye ek ve müşteriye giden e-postaların
  // listesi; bir e-postanın metni alt sayfadır (?kod=). Mağaza ayarıdır, yalnız mağaza sahibinin izinleriyle.
  {
    kod: "epostalar",
    adres: epostalarAdresi,
    ad: "yonetim.sayfa.epostalar.ad",
    aciklama: "yonetim.sayfa.epostalar.aciklama",
    ikon: "eposta",
    izin: "magaza-ayarlari.gor",
    grup: "ayarlar",
  },
  {
    kod: "eposta-metni",
    adres: `${epostalarAdresi}/metin`,
    ad: "yonetim.sayfa.epostaMetni.ad",
    aciklama: "yonetim.sayfa.epostaMetni.aciklama",
    ikon: "eposta",
    izin: "magaza-ayarlari.gor",
    grup: "ayarlar",
    ust: "epostalar",
  },
  // Ekip (kart 0274, karar 0178): kullanıcılar, roller (yalnız okunur) ve kullanıcının ayrıntısı (?kimlik=); yöneticinin
  // kendi hesabı (yedek kodlar, kart 0053).
  {
    kod: "ekip",
    adres: ekipAdresi,
    ad: "yonetim.sayfa.ekip.ad",
    aciklama: "yonetim.sayfa.ekip.aciklama",
    ikon: "ekip",
    izin: "ekip.gor",
    grup: "ayarlar",
  },
  {
    kod: "ekip-rolleri",
    adres: ekipRolleriAdresi,
    ad: "yonetim.sayfa.ekipRolleri.ad",
    aciklama: "yonetim.sayfa.ekipRolleri.aciklama",
    ikon: "guvenlik",
    izin: "ekip.gor",
    grup: "ayarlar",
    ust: "ekip",
  },
  {
    kod: "ekip-kisi",
    adres: `${ekipAdresi}/kisi`,
    ad: "yonetim.sayfa.ekipKisi.ad",
    aciklama: "yonetim.sayfa.ekipKisi.aciklama",
    ikon: "hesap",
    izin: "ekip.gor",
    grup: "ayarlar",
    ust: "ekip",
  },
  {
    kod: "hesabim",
    adres: hesabimAdresi,
    ad: "yonetim.sayfa.hesabim.ad",
    aciklama: "yonetim.sayfa.hesabim.aciklama",
    ikon: "hesap",
    izin: "ekip.kendi-hesabi.gor",
    grup: "ayarlar",
  },
] as const satisfies readonly PanelSayfaTanimi[];

export type PanelSayfaKodu = (typeof panelSayfalari)[number]["kod"];

export type MenuSayfasi = {
  kod: string;
  adres: string;
  ad: MetinAnahtari;
  ikon: PanelIkonAdi;
  isaret?: MetinAnahtari;
  sayac?: MenuSayaci;
};
export type MenuGrubu = { grup: PanelGrubu | null; sayfalar: MenuSayfasi[] };

// Sayfa sitede açık mı: eklentinin getirdiği sayfa yalnız eklenti açıkken vardır.
export const sayfaAcikMi = (
  sayfa: Pick<PanelSayfaTanimi, "eklenti">,
  eklentiAcik: (kod: EklentiKodu) => boolean,
): boolean => sayfa.eklenti === undefined || eklentiAcik(sayfa.eklenti);

// Yöneticinin göreceği menü: yalnız izni olan, sitede açık ve alt sayfa olmayan sayfalar, gruplar menü sırasıyla,
// boş grup yok. Grupsuz sayfalar en üstte durur. İzin sunucuda okunur (yoneticininYetkileri), burada yalnız sorulur.
export const menuyuKur = (
  agac: readonly PanelSayfaTanimi[],
  yetkili: (izin: GirisIzni<"yonetici">) => boolean,
  eklentiAcik: (kod: EklentiKodu) => boolean = () => false,
): MenuGrubu[] => {
  const gorunenler = agac.filter(
    (sayfa) =>
      sayfa.ust === undefined &&
      (sayfa.izin === null || yetkili(sayfa.izin)) &&
      sayfaAcikMi(sayfa, eklentiAcik),
  );
  const gruplar: (PanelGrubu | null)[] = [null, ...(Object.keys(panelGruplari) as PanelGrubu[])];
  return gruplar
    .map((grup) => ({
      grup,
      sayfalar: gorunenler
        .filter((sayfa) => sayfa.grup === grup)
        .map(({ kod, adres, ad, ikon, isaret, sayac }) => ({
          kod,
          adres,
          ad,
          ikon,
          ...(isaret === undefined ? {} : { isaret }),
          ...(sayac === undefined ? {} : { sayac }),
        })),
    }))
    .filter((grup) => grup.sayfalar.length > 0);
};

export const sayfaTanimi = (
  agac: readonly PanelSayfaTanimi[],
  kod: string,
): PanelSayfaTanimi | undefined => agac.find((sayfa) => sayfa.kod === kod);

// Kökten sayfaya kadar olan sayfalar: kök, üst sayfalar, sayfanın kendisi. Kökün kendisi tek adımdır.
// Döngü ve olmayan üst ağaç testinde yakalanır; burada yine de sonsuza dönülmez.
export const sayfaYolunuKur = (
  agac: readonly PanelSayfaTanimi[],
  kod: string,
): PanelSayfaTanimi[] => {
  const [kok] = agac;
  const yol: PanelSayfaTanimi[] = [];
  let sayfa = sayfaTanimi(agac, kod);
  while (sayfa !== undefined && !yol.includes(sayfa)) {
    yol.unshift(sayfa);
    sayfa = sayfa.ust === undefined ? undefined : sayfaTanimi(agac, sayfa.ust);
  }
  if (kok !== undefined && yol[0] !== kok) yol.unshift(kok);
  return yol;
};

// Sayfa yolunun adımları (kart 0301, taslak karar 0157): kök, sayfanın menüdeki grubu, üst sayfalar, sayfanın kendisi.
// Grubun kendi sayfası yoktur, adımı bağlantı değildir (adresi yok). Kökün ve grupsuz sayfanın yolunda grup yoktur.
export type SayfaYoluAdimTanimi = { ad: MetinAnahtari; adres?: string };
export const sayfaYoluAdimlari = (
  agac: readonly PanelSayfaTanimi[],
  kod: string,
): SayfaYoluAdimTanimi[] => {
  const [kok, ...geri] = sayfaYolunuKur(agac, kod).map(({ ad, adres }) => ({ ad, adres }));
  const grup = sayfaTanimi(agac, kod)?.grup;
  if (kok === undefined) return [];
  if (geri.length === 0 || grup === null || grup === undefined) return [kok, ...geri];
  return [kok, { ad: panelGruplari[grup] }, ...geri];
};
