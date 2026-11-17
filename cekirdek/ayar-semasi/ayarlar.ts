// Bütün site ayarlarının şeması (.claude/rules/ayarlar.md, karar 0010).
// Her ayarın türü ve varsayılanı şemada, açıklaması ve kimin değiştirdiği ayar bilgisinde yazar.
// Değerler planlar/site-ayarlari.md dosyasındandır. İki şema vardır, her ayar sahibinin şemasında durur:
// - ayarSemasi: altyapı sahibinin ayarları. Sitenin ayarlar.json dosyasında yalnız varsayılandan
//   farklı olanlar yazılır, kayıt ve yayınla değişir.
// - magazaAyarSemasi: mağaza sahibinin ayarları. Sitenin veritabanında durur, panelden değişir. Site
//   klasöründe yalnız başlangıç değerleri olur (baslangic/ayarlar.json); ayar veritabanında ilk kez
//   yokken bir kez yazılır (cekirdek/moduller/magaza-ayarlari/, karar 0055).
import { z } from "zod";
import { postaAdresiSemasi, telefonSemasi } from "../bolgeler/adres.ts";
import { ulkeGecerliMi } from "../bolgeler/bolgeler.ts";
import { saticiBilgileriSemasi } from "../bolgeler/satici.ts";
import { eklentiKodlari, stokBildirimiAyari } from "../kayitlar/eklentiler.ts";
import { favoriSiniriEnCok } from "../kayitlar/favori.ts";
import { listeSayfasi, listeSiralamalari, sayfaGecisleri } from "../kayitlar/liste.ts";
import { stokAyirmaSuresiSinirlari } from "../kayitlar/odeme.ts";
import {
  sepeteEkleyinceSecenekleri,
  sepetTutariEnCok,
  ucretsizKargoTutarlari,
} from "../kayitlar/sepet.ts";
import { type AyarSahibi, ayarSahibi } from "../kayitlar/site.ts";
import { sosyalHesapKalibi, sosyalHesapSiniri, sosyalSiteler } from "../kayitlar/sosyal-siteler.ts";
import { tukenenUrunDavranislari } from "../kayitlar/stok.ts";
import { secenekOnSecimleri, tukenmisSecenekGosterimleri } from "../kayitlar/urun.ts";
import { videoSiteAdlari } from "../kayitlar/video-siteleri.ts";
import { saatDilimiGecerliMi } from "../metinler/bicimleyici.ts";
import { diller, type MetinAnahtari, varsayilanDil } from "../metinler/metin.ts";
import { kayitDegeriYasakMi, kayitMetniHatasi } from "../moduller/degisiklik-kaydi/deger.ts";
import {
  fiyatGirisleri,
  vergiAdiSemasi,
  vergiAdresleri,
  vergiYuvarlamalari,
} from "../moduller/vergi/semalar.ts";
import { kodSemasi } from "../temalar/sema.ts";
import { kimlikSemasi } from "../veritabani/kimlik.ts";

export type AyarBilgisi = {
  aciklama: MetinAnahtari;
  kimDegistirir: AyarSahibi;
  // Değeri değişiklik kaydına yazılmaz, yalnız ayarın değiştiği yazılır (kart 0071). Kişisel veri
  // taşıyabilen ayarlar içindir: küçük mağazada iletişim bilgisi çoğu zaman sahibinin kendisidir.
  kayittaGizli?: true;
  // Genel ayar değiştirmeyle değişmez, yalnız kendi işleviyle (kart 0073): değeri başka bir kayda
  // (örneğin dosya deposundaki logo) bağlıdır ve o işlev bağı kurar. Şemadan üretilen ayar ekranı
  // bu ayarı göstermez.
  kendiIsleviyle?: true;
};

// Her ayarın açıklaması ve sahibi. Panelin ayar ekranları bu bilgiden üretilecek.
export const ayarBilgileri = z.registry<AyarBilgisi>();

const ayar = <T extends z.ZodType>(sema: T, bilgi: AyarBilgisi): T => {
  ayarBilgileri.add(sema, bilgi);
  return sema;
};

const altyapiSahibinin = (aciklama: MetinAnahtari): AyarBilgisi => ({
  aciklama,
  kimDegistirir: ayarSahibi.altyapi,
});

export const magazaSahibinin = (
  aciklama: MetinAnahtari,
  secenekler: { kayittaGizli?: true; kendiIsleviyle?: true } = {},
): AyarBilgisi => ({
  aciklama,
  kimDegistirir: ayarSahibi.magaza,
  ...secenekler,
});

// Ülke kodları listesi: en az bir ülke, her kod ülke listesinde (cekirdek/bolgeler/), tekrar yok.
const ulkeListesi = z
  .array(z.string().refine(ulkeGecerliMi, "Ülke listesinde olmayan kod, örneğin TR."))
  .min(1, "En az bir ülke olmalı.")
  .refine((liste) => new Set(liste).size === liste.length, "Aynı ülke iki kez yazılmış.");

export const ayarSemasi = z.strictObject({
  // Satış ve teslimat yapılan ülkeler (kart 0071, karar 0010): satış ayarlarını değiştirdiği için
  // altyapı sahibinindir.
  satisUlkeleri: ayar(ulkeListesi.default(["TR"]), altyapiSahibinin("ayar.aciklama.satisUlkeleri")),
  teslimatUlkeleri: ayar(
    ulkeListesi.default(["TR"]),
    altyapiSahibinin("ayar.aciklama.teslimatUlkeleri"),
  ),
  dil: ayar(z.enum(diller).default(varsayilanDil), altyapiSahibinin("ayar.aciklama.dil")),
  // Para biriminin çekirdekte varsayılanı yoktur: çekirdekte bir ülkenin para birimi ya da simgesi
  // yazılmaz (kart 0081, karar 0067). Site ayarlar.json dosyasında yazar.
  paraBirimi: ayar(
    z.string().regex(/^[A-Z]{3}$/, "Üç büyük harfli ISO 4217 para birimi kodu olmalı."),
    altyapiSahibinin("ayar.aciklama.paraBirimi"),
  ),
  paraBicimi: ayar(
    z
      .strictObject({
        // Yazılmazsa para biriminin sitenin dilindeki simgesi kullanılır (biçimleyici, dil verisinden).
        simge: z.string().min(1).optional(),
        simgeYeri: z.enum(["basta", "sonda"]).default("sonda"),
        simgeBoslugu: z.boolean().default(true),
        binlikAyirici: z.string().default("."),
        ondalikAyirici: z.string().min(1).default(","),
        ondalikSayisi: z.int().min(0).max(4).default(2),
      })
      .prefault({}),
    altyapiSahibinin("ayar.aciklama.paraBicimi"),
  ),
  saatDilimi: ayar(
    z
      .string()
      .refine(saatDilimiGecerliMi, "Tanınan bir saat dilimi olmalı, örneğin Europe/Istanbul.")
      .default("Europe/Istanbul"),
    altyapiSahibinin("ayar.aciklama.saatDilimi"),
  ),
  agirlikBirimi: ayar(
    z.enum(["kg", "g", "lb", "oz"]).default("kg"),
    altyapiSahibinin("ayar.aciklama.agirlikBirimi"),
  ),
  boyutBirimi: ayar(
    z.enum(["cm", "mm", "in"]).default("cm"),
    altyapiSahibinin("ayar.aciklama.boyutBirimi"),
  ),
  // Ürün galerisine bağlantısı eklenebilen video siteleri (kart 0087, karar 0073). Video müşteriyi o
  // siteye bağladığı için çerez ve gizlilik metinlerini etkiler: altyapı sahibinindir. Boş liste
  // galeriye video eklenmesini kapatır.
  videoSiteleri: ayar(
    z
      .array(z.enum(videoSiteAdlari))
      .refine((liste) => new Set(liste).size === liste.length, "Aynı site iki kez yazılmış.")
      .default([...videoSiteAdlari]),
    altyapiSahibinin("ayar.aciklama.videoSiteleri"),
  ),
  // Varsayılanı sitenin görünen adından türetilir (site-klasoru.ts), bu yüzden şemada boş kalabilir.
  siparisOneki: ayar(
    z
      .string()
      .regex(/^[A-Z]{2,5}$/, "2-5 büyük harf olmalı (yalnız İngiliz alfabesi), örneğin ORN.")
      .optional(),
    altyapiSahibinin("ayar.aciklama.siparisOneki"),
  ),
  siparisBaslangici: ayar(
    z.int().positive().default(1001),
    altyapiSahibinin("ayar.aciklama.siparisBaslangici"),
  ),
  temaDegistirilebilir: ayar(
    z.boolean().default(true),
    altyapiSahibinin("ayar.aciklama.temaDegistirilebilir"),
  ),
  // Mağaza sahibinin seçebileceği temalar (kart 0105): hazır temaların ve sitenin kendi temalarının
  // (tema/ klasörü) kodları. İlki sitenin başlangıç temasıdır. Verilmezse bütün hazır temalardır; listede
  // olmayan tema seçilemez. Kodların var olduğu site klasörü doğrulamasında denetlenir.
  temalar: ayar(
    z
      .array(kodSemasi)
      .min(1, "En az bir tema olmalı.")
      .refine((liste) => new Set(liste).size === liste.length, "Aynı tema iki kez yazılmış.")
      .optional(),
    altyapiSahibinin("ayar.aciklama.temalar"),
  ),
  vitrindeAltyapiAdi: ayar(
    z.boolean().default(false),
    altyapiSahibinin("ayar.aciklama.vitrindeAltyapiAdi"),
  ),
  // Ana sayfada başlığın altında "Yakında açılıyoruz." yazısı (kart 0041). Bakım modu değildir:
  // vitrin açık kalır. Mağaza sahibinin ayarları gelince panele taşınabilir.
  yakindaYazisi: ayar(z.boolean().default(false), altyapiSahibinin("ayar.aciklama.yakindaYazisi")),
  // Bakım sayfasının metni (kart 0043). Sayfayı ön kapı sunar; boşsa ortak metin görünür.
  bakimMetni: ayar(
    z.string().trim().min(1).max(300).optional(),
    altyapiSahibinin("ayar.aciklama.bakimMetni"),
  ),
  // E-postanın göndereni (kart 0032). Gönderen adresi olmayan site e-posta göndermez.
  epostaGonderenAdi: ayar(
    z.string().trim().min(1).max(100).optional(),
    altyapiSahibinin("ayar.aciklama.epostaGonderenAdi"),
  ),
  epostaGonderenAdresi: ayar(
    z.email().optional(),
    altyapiSahibinin("ayar.aciklama.epostaGonderenAdresi"),
  ),
  epostaYanitAdresi: ayar(
    z.email().optional(),
    altyapiSahibinin("ayar.aciklama.epostaYanitAdresi"),
  ),
  // Hiç girilmeyen oturumun kapanma süresi (kart 0025). Güvenlik ayarıdır, altyapı sahibinindir.
  yoneticiOturumuSaat: ayar(
    z.int().min(1).max(720).default(24),
    altyapiSahibinin("ayar.aciklama.yoneticiOturumuSaat"),
  ),
  musteriOturumuGun: ayar(
    z.int().min(1).max(365).default(30),
    altyapiSahibinin("ayar.aciklama.musteriOturumuGun"),
  ),
  // Bir müşterinin en çok kaç ürünü favorilerine ekleyebileceği (kart 0140, karar 0110). Hem hesaptaki hem
  // tarayıcıdaki liste için geçerlidir. Veritabanının yükünü ve favoriler çerezinin boyunu belirlediği için
  // altyapı sahibinindir; en büyük değeri çerezin sınırından gelir (cekirdek/kayitlar/favori.ts).
  favoriSiniri: ayar(
    z.int().min(1).max(favoriSiniriEnCok).default(100),
    altyapiSahibinin("ayar.aciklama.favoriSiniri"),
  ),
  // Tema demosu (kart 0116, karar 0127): ziyaretçi temayı adresten seçer (?tema=), vitrinin üstünde demo şeridi
  // ve temalar arası geçiş durur, site arama motorlarına kapalıdır, ziyaretçi yalnız gezer (kayıt, giriş,
  // sipariş, yorum, bildirim yok; uçlar da reddeder, cekirdek/kapi/uc.ts). Gerçek mağazada açılmaz.
  temaDemosu: ayar(z.boolean().default(false), altyapiSahibinin("ayar.aciklama.temaDemosu")),
  // Sitede açık eklentiler (kart 0144, karar 0117). Eklentinin kodu çekirdektedir; kurulu eklenti kapalı
  // başlar, bu listeye yazılınca açılır. Eklenti başka bir hizmeti ya da ücreti getirebileceği için altyapı
  // sahibinindir.
  eklentiler: ayar(
    z
      .array(z.enum(eklentiKodlari))
      .refine((liste) => new Set(liste).size === liste.length, "Aynı eklenti iki kez yazılmış.")
      .default([]),
    altyapiSahibinin("ayar.aciklama.eklentiler"),
  ),
});

// Mağaza sahibinin ayarları. Her ayarın varsayılanı olur (ya da boş kalabilir); veritabanında JSON
// olarak saklandığı için değer null olamaz, boş değer "yok" demektir.
export const magazaAyarSemasi = z.strictObject({
  // Vitrinde, panelde ve e-postalarda görünen ad (kart 0071). Başlangıç değeri verilmezse kimlikteki
  // görünen addır (site-klasoru.ts); kimlikteki ad altyapının iç adı olarak kalır.
  // "@" içermez: e-posta biçimindeki değeri değişiklik kaydı reddeder (karar 0045).
  magazaAdi: ayar(
    z
      .string()
      .trim()
      .min(1)
      .max(100)
      .refine((ad) => !ad.includes("@"), "Mağaza adında @ olamaz.")
      .optional(),
    magazaSahibinin("ayar.aciklama.magazaAdi"),
  ),
  // İletişim bilgileri ve mağaza adresi boş başlar: anlamlı bir varsayılanı yoktur.
  iletisimEpostasi: ayar(
    z.email().optional(),
    magazaSahibinin("ayar.aciklama.iletisimEpostasi", { kayittaGizli: true }),
  ),
  iletisimTelefonu: ayar(
    telefonSemasi.optional(),
    magazaSahibinin("ayar.aciklama.iletisimTelefonu", { kayittaGizli: true }),
  ),
  magazaAdresi: ayar(
    postaAdresiSemasi.optional(),
    magazaSahibinin("ayar.aciklama.magazaAdresi", { kayittaGizli: true }),
  ),
  // Satıcı bilgileri (kart 0091, karar 0138): unvan, vergi kimlik bilgileri, MERSİS, ticaret sicil, KEP. Boş başlar.
  // Şahıs işletmesinde unvan ve kimlik numarası kişisel veridir: değeri değişiklik kaydına yazılmaz.
  saticiBilgileri: ayar(
    saticiBilgileriSemasi.optional(),
    magazaSahibinin("ayar.aciklama.saticiBilgileri", { kayittaGizli: true }),
  ),
  // Mağazanın sosyal hesapları (kart 0108, karar 0083): site ve kullanıcı adı, adres kayıttan kurulur
  // (cekirdek/kayitlar/sosyal-siteler.ts). Alt kısmın sosyal hesaplar bölümü buradan okur. Boş başlar.
  sosyalHesaplar: ayar(
    z
      .array(
        z.strictObject({
          site: z.enum(sosyalSiteler),
          hesap: z.string().trim().regex(sosyalHesapKalibi),
        }),
      )
      .max(sosyalHesapSiniri)
      .refine(
        (hesaplar) => new Set(hesaplar.map((h) => `${h.site}:${h.hesap}`)).size === hesaplar.length,
        "Aynı hesap iki kez yazılmış.",
      )
      .default([]),
    magazaSahibinin("ayar.aciklama.sosyalHesaplar"),
  ),
  // Mağaza sahibinin yüklediği logo: dosya deposundaki kaydın kimliği (kart 0073, karar 0059).
  // Boşsa sitenin ilk logosu (marka/ klasörü), o da yoksa mağaza adı görünür.
  // Yalnız logoyuDegistir ve logoyuKaldir değiştirir: herhangi bir dosya kimliği logo yapılamaz.
  logo: ayar(
    kimlikSemasi.optional(),
    magazaSahibinin("ayar.aciklama.logo", { kendiIsleviyle: true }),
  ),
  // Vergi (kart 0074, karar 0060). Kapalıysa vergi tutarı sıfırdır (kart 0075). Vergi adının çekirdekte
  // varsayılanı yoktur: çekirdekte bir ülkenin vergi adı yazılmaz, site başlangıç dosyasında verir.
  // Oranın kendi adı yoksa bu ad kullanılır. Sınıflar ve oranlar ayar değil, vergi modülünün tablosudur.
  vergiAcik: ayar(z.boolean().default(true), magazaSahibinin("ayar.aciklama.vergiAcik")),
  vergiAdi: ayar(vergiAdiSemasi.optional(), magazaSahibinin("ayar.aciklama.vergiAdi")),
  // Vergi hesabının ayarları (kart 0075, karar 0061). Seçenekler vergi modülündedir.
  fiyatGirisi: ayar(
    z.enum(fiyatGirisleri).default("vergi-dahil"),
    magazaSahibinin("ayar.aciklama.fiyatGirisi"),
  ),
  vergiAdresi: ayar(
    z.enum(vergiAdresleri).default("teslimat"),
    magazaSahibinin("ayar.aciklama.vergiAdresi"),
  ),
  vergiYuvarlama: ayar(
    z.enum(vergiYuvarlamalari).default("satir"),
    magazaSahibinin("ayar.aciklama.vergiYuvarlama"),
  ),
  // Gösterilecek fiyat (kart 0081, karar 0067). Fiyat vitrinde, sepette ve e-postada vergi dahil ya
  // da hariç gösterilir; girildiği biçimden farklıysa vergi hesabıyla çevrilir.
  fiyatGosterimi: ayar(
    z.enum(fiyatGirisleri).default("vergi-dahil"),
    magazaSahibinin("ayar.aciklama.fiyatGosterimi"),
  ),
  // Fiyatın yanındaki metin. Yazılmazsa vergi adından ve gösterimden kurulur ("<vergi adı> dahil");
  // boş metin hiçbir şey göstermez.
  fiyatEkMetni: ayar(
    z
      .string()
      .trim()
      .max(60)
      .refine((deger) => !kayitDegeriYasakMi(deger), kayitMetniHatasi)
      .transform((deger) => deger.normalize("NFC"))
      .optional(),
    magazaSahibinin("ayar.aciklama.fiyatEkMetni"),
  ),
  // İndirimli üründe eski fiyat: açıksa indirimden önceki 30 günün en düşük fiyatı, kapalıysa
  // indirimden önceki satış fiyatı (kart 0081, karar 0067).
  indirimdeEnDusukFiyat: ayar(
    z.boolean().default(true),
    magazaSahibinin("ayar.aciklama.indirimdeEnDusukFiyat"),
  ),
  // Stok durumu (kart 0083, karar 0069). Tükenen ürün: göster ama satma ya da listelerden gizle.
  tukenenUrun: ayar(
    z.enum(tukenenUrunDavranislari).default("goster"),
    magazaSahibinin("ayar.aciklama.tukenenUrun"),
  ),
  // Vitrindeki ürün listeleri (kart 0136, karar 0102): kategori, marka, etiket ve arama sayfası.
  listeSiralamasi: ayar(
    z.enum(listeSiralamalari).default("onerilen"),
    magazaSahibinin("ayar.aciklama.listeSiralamasi"),
  ),
  listeSayfaGecisi: ayar(
    z.enum(sayfaGecisleri).default("numarali"),
    magazaSahibinin("ayar.aciklama.listeSayfaGecisi"),
  ),
  listeSayfaBoyutu: ayar(
    z.int().min(1).max(listeSayfasi.enCokBoyut).default(listeSayfasi.varsayilanBoyut),
    magazaSahibinin("ayar.aciklama.listeSayfaBoyutu"),
  ),
  // Ürün sayfası (kart 0138, karar 0102 ve 0108): tükenmiş seçenek değerinin gösterimi ve sayfa ilk
  // açıldığında seçili birleşim. Seçenekler cekirdek/kayitlar/urun.ts'dedir.
  tukenmisSecenek: ayar(
    z.enum(tukenmisSecenekGosterimleri).default("ustu-cizili"),
    magazaSahibinin("ayar.aciklama.tukenmisSecenek"),
  ),
  secenekOnSecimi: ayar(
    z.enum(secenekOnSecimleri).default("ilk-satilabilir"),
    magazaSahibinin("ayar.aciklama.secenekOnSecimi"),
  ),
  // Ürün yorumları (kart 0139, karar 0101 ve 0109). Satın alma denetimi sipariş modülüyle gelir: bugün kimse
  // satın almış sayılmaz, bu yüzden ilk ayar açıkken kimse yorum yazamaz.
  yorumYalnizSatinAlanlar: ayar(
    z.boolean().default(true),
    magazaSahibinin("ayar.aciklama.yorumYalnizSatinAlanlar"),
  ),
  dogrulanmisAliciEtiketi: ayar(
    z.boolean().default(true),
    magazaSahibinin("ayar.aciklama.dogrulanmisAliciEtiketi"),
  ),
  // Düşük stok eşiği: stok bu sayıya eşit ya da altındaysa (ve sıfırdan büyükse) düşük stoktadır. Ürünün
  // kendi eşiği varsa o geçerlidir. 0 düşük stok uyarısını kapatır.
  dusukStokEsigi: ayar(
    z.int().min(0).max(1_000_000).default(5),
    magazaSahibinin("ayar.aciklama.dusukStokEsigi"),
  ),
  // "Son 3 ürün" yazısı: stok bu sayıya eşit ya da altındaysa müşteriye kalan adet yazılır. 0 yazıyı
  // kapatır.
  sonAdetEsigi: ayar(
    z.int().min(0).max(1000).default(5),
    magazaSahibinin("ayar.aciklama.sonAdetEsigi"),
  ),
  // Kargoya verme süresi, iş günü (kart 0110, planlar/site-ayarlari.md: varsayılan 1). Bugün güven şeridinin
  // yer tutucusu okur (cekirdek/kayitlar/yer-tutucular.ts); ürün sayfası ve ön bilgilendirme metni kendi
  // kartlarıyla okuyacak. 0 "aynı gün" demektir.
  kargoyaVermeSuresi: ayar(
    z.int().min(0).max(60).default(1),
    magazaSahibinin("ayar.aciklama.kargoyaVermeSuresi"),
  ),
  // Kargo (kart 0212, karar 0135; planlar/site-ayarlari.md): başlangıçta tek teslimat bölgesi, sabit ücret ve
  // ücretsiz kargo sınırı. Tutarlar kuruş, fiyat girişi ayarına göre (vergi dahil ya da hariç). Ücret 0 kargoyu
  // her zaman ücretsiz yapar (varsayılan, kullanıcı kararı); sınır boşsa ücretsiz kargo sınırı yoktur. Sınır
  // sepetin indirimden sonraki ya da önceki tutarıyla karşılaştırılır. Hesap: cekirdek/moduller/kargo/hesap.ts.
  kargoUcreti: ayar(
    z.int().min(0).max(sepetTutariEnCok).default(0),
    magazaSahibinin("ayar.aciklama.kargoUcreti"),
  ),
  ucretsizKargoSiniri: ayar(
    z.int().min(0).max(sepetTutariEnCok).optional(),
    magazaSahibinin("ayar.aciklama.ucretsizKargoSiniri"),
  ),
  ucretsizKargoTutari: ayar(
    z.enum(ucretsizKargoTutarlari).default("indirimden-sonra"),
    magazaSahibinin("ayar.aciklama.ucretsizKargoTutari"),
  ),
  // Ürün sepete eklenince ne olur (karar 0132): seçenekler cekirdek/kayitlar/sepet.ts'tedir.
  sepeteEkleyince: ayar(
    z.enum(sepeteEkleyinceSecenekleri).default("yan-pencere"),
    magazaSahibinin("ayar.aciklama.sepeteEkleyince"),
  ),
  // Ödeme adımı (kart 0213, karar 0140; planlar/site-ayarlari.md). Üye olmadan alışveriş kapalıysa ödeme adımı
  // girişe yönlendirir; telefon kargo firmaları için varsayılan zorunludur. Stok ayırma süresi dakikadır: müşteri
  // "Siparişi onayla"ya basınca sepetin birimleri bu kadar ayrılır (cekirdek/kayitlar/odeme.ts).
  uyeOlmadanAlisveris: ayar(
    z.boolean().default(true),
    magazaSahibinin("ayar.aciklama.uyeOlmadanAlisveris"),
  ),
  telefonZorunlu: ayar(z.boolean().default(true), magazaSahibinin("ayar.aciklama.telefonZorunlu")),
  stokAyirmaSuresi: ayar(
    z
      .int()
      .min(stokAyirmaSuresiSinirlari.enAz)
      .max(stokAyirmaSuresiSinirlari.enCok)
      .default(stokAyirmaSuresiSinirlari.varsayilan),
    magazaSahibinin("ayar.aciklama.stokAyirmaSuresi"),
  ),
  // Stoğa gelince haber ver eklentisi (kart 0144, karar 0117): üye olmayan müşteri de talep bırakabilir mi,
  // talep kaç gün saklanır. Eklenti kapalıyken okunmaz.
  stokBildirimiUyeOlmayan: ayar(
    z.boolean().default(true),
    magazaSahibinin("ayar.aciklama.stokBildirimiUyeOlmayan"),
  ),
  stokBildirimiSaklamaGun: ayar(
    z
      .int()
      .min(stokBildirimiAyari.saklamaGunEnAz)
      .max(stokBildirimiAyari.saklamaGunEnCok)
      .default(stokBildirimiAyari.saklamaGunVarsayilan),
    magazaSahibinin("ayar.aciklama.stokBildirimiSaklamaGun"),
  ),
});
export type MagazaAyarlari = z.output<typeof magazaAyarSemasi>;

// Varsayılanları uygulanmış ve sipariş öneki türetilmiş ayarlar.
export type SiteAyarlari = Omit<z.output<typeof ayarSemasi>, "siparisOneki"> & {
  siparisOneki: string;
};

// Görünen addan sipariş öneki: ilk üç harf, büyük ve yalnız İngiliz alfabesiyle ("Örnek" → "ORN").
export const onekTuret = (gorunenAd: string): string =>
  gorunenAd
    .replaceAll("ı", "i")
    .replaceAll("İ", "I")
    .normalize("NFD")
    .replace(/[^A-Za-z]/g, "")
    .slice(0, 3)
    .toUpperCase();
