# Site ayarları (taslak)

Siteden siteye değişebilen davranışların listesi. Her yeni site bu varsayılan değerlerle başlar, kurulurken gerekenler değiştirilir. Bu dosya bir taslaktır, plan aşamasında çekirdeğin ayar şemasına dönüşür (`.claude/rules/ayarlar.md`).

Durum: 2026-10-28 tarihinde kullanıcı onayıyla yazıldı. Aynı gün ilk site Örnek Mağaza'nın değerleri eklendi (karar 0007) ve üç yeni ayar girdi: kapıda ödeme seçenekleri, kargoya verme süresi, iade kargosunu kim öder (karar 0008). "Örnek Mağaza" sütununda "—" yazan ayar varsayılanla çalışır. Aynı gün her ayara "Kim değiştirir" sütunu eklendi (karar 0010): altyapı sahibinin ayarları site klasöründe durur ve yayınla değişir, mağaza sahibinin ayarları panelden değişir, site klasöründe yalnız başlangıç değerleri durur (`planlar/cekirdek-ve-siteler.md`). Aynı gün altyapı sahibinin ayarları çekirdeğin ayar şemasına girdi (kart 0010). Bu ayarların asıl yeri artık `cekirdek/ayar-semasi/ayarlar.ts` dosyasıdır; buradaki tablo değişirse şema da aynı değişiklikte güncellenir. 2026-11-07'de mağaza sahibinin ayarlarının yeri kuruldu (kart 0069, karar 0055): şemada `magazaAyarSemasi`, değerler sitenin veritabanında, başlangıç değerleri site klasöründe `baslangic/ayarlar.json`. Aşağıda "Mağaza sahibi" yazan ayarlar şemaya kendi kartlarıyla girer.

## Örnek Mağaza

İlk demo sitesi. Gerçek satış yapmaz, her özellik önce onda denenir (karar 0007).

- Kategoriler: Giyim (tişört, sweatshirt; beden ve renk seçenekli), Ev ve Yaşam (mum, vazo, kupa), Elektronik Aksesuar (şarj kablosu, telefon kılıfı, kulaklık). Özel kurallı ürün yok.
- Ürünler demoda %20 KDV sınıfıyla girilir. Giyimin doğru oranı gerçek mağazada muhasebeciye sorulur.
- Kargo ücreti ve ücretsiz kargo sınırı sonra panelden girilir. Kart 0216'da kullanıcı kararı: 49,90 TL, 750 TL ve üstü ücretsiz. Değer başlangıç dosyasına yazılmaz, çünkü tarayıcı testleri bu sitenin klasörüyle çalışır ve kargoyu varsayılanında (ücretsiz) ölçer. Sunucudaki siteye panelden girilir.

## Mağaza

| Ayar | Kim değiştirir | Varsayılan | Örnek Mağaza | Not |
|---|---|---|---|---|
| Satış yapılan ülkeler | Altyapı sahibi | Türkiye | — | Liste; her kod ülke listesinde (kart 0071) |
| Teslimat yapılan ülkeler | Altyapı sahibi | Türkiye | — | Liste (kart 0071) |
| Dil | Altyapı sahibi | Türkçe | — | |
| Para birimi | Altyapı sahibi | Çekirdekte yok, site yazar; Türkiye'de kurulan site TRY | TRY | `paraBirimi`, ISO 4217 kodu, `ayarlar.json` (kart 0081, karar 0067) |
| Para biçimi | Altyapı sahibi | 1.234,56 ₺ (simge sonda, binlikte nokta, ondalıkta virgül, 2 ondalık) | — | `paraBicimi`. Simge yazılmazsa para biriminin sitenin dilindeki simgesi kullanılır (dil verisinden) |
| Saat dilimi | Altyapı sahibi | İstanbul (Europe/Istanbul) | — | |
| Ağırlık birimi | Altyapı sahibi | kg | — | |
| Boyut birimi | Altyapı sahibi | cm | — | |
| Sipariş numarası öneki | Altyapı sahibi | Mağaza adından 3 harf | ORN | Kurulumda mağaza adından önerilir. Numara siparişte tam yazılışıyla saklanır: önek sonradan değişse de eski numara değişmez (kart 0214) |
| Sipariş numarası başlangıcı | Altyapı sahibi | 1001 | — | İlk siparişin numarası; numara veritabanının sırasından gelir (kart 0214, karar 0141). İlk siparişten sonra değiştirilmez |
| Mağaza adı | Mağaza sahibi | Kimlikteki görünen ad | — | Vitrinde, panelde ve e-postalarda görünür; kimlikteki ad altyapının iç adıdır, bakım sayfası onu gösterir (kart 0071, karar 0057) |
| İletişim e-postası | Mağaza sahibi | Boş | `iletisim@ornek-magaza.test` | Değeri değişiklik kaydına yazılmaz |
| İletişim telefonu | Mağaza sahibi | Boş | `+90 312 000 00 00` | Ülke koduyla. Değeri değişiklik kaydına yazılmaz |
| Mağaza adresi | Mağaza sahibi | Boş | Ankara / Çankaya, Deneme Sokak No: 1, 06000 | Ülke, il, ilçe (listeden), adres, posta kodu. Değeri değişiklik kaydına yazılmaz. Örnek Mağaza'nınki deneme değeridir |
| Satıcı bilgileri | Mağaza sahibi | Boş | Şirket, "Örnek Mağaza Deneme Ticaret A.Ş.", vergi numarası `1111111114`, MERSİS `0111111111400015` (uydurma) | `saticiBilgileri` (kart 0091, karar 0138): ülke, işletme türü (şirket ya da şahıs) ve unvan zorunlu; vergi dairesi, vergi numarası (şahısta kimlik numarası), MERSİS ve ticaret sicil numarası, KEP adresi isteğe bağlı. Biçim ve kontrol hanesi ülkenin veri dosyasından. Değeri değişiklik kaydına yazılmaz. Hangilerinin gerçek mağaza açılmadan dolu olması gerektiği kart 0063'te hukukçuya sorulur (kullanıcı kararı). Mesafeli satış sözleşmesi ve ön bilgilendirme formu buradan okur (kart 0213, 0063) |
| Sosyal hesaplar | Mağaza sahibi | Boş | — | Site (Instagram, Facebook, X, YouTube, TikTok, Pinterest, LinkedIn) ve kullanıcı adı; adres kayıttan kurulur. Vitrinin alt kısmında görünür (kart 0108, karar 0083) |

## Vergi

| Ayar | Kim değiştirir | Varsayılan | Örnek Mağaza | Not |
|---|---|---|---|---|
| Vergi | Mağaza sahibi | Açık | — | |
| Vergi adı | Mağaza sahibi | Çekirdekte boş; Türkiye'de kurulan site KDV | KDV | `baslangic/ayarlar.json` (`vergiAdi`). Oranın kendi adı varsa o görünür |
| Vergi sınıfları ve oranları | Mağaza sahibi | Çekirdekte yok; Türkiye'de kurulan site %20, %10, %1, %0 | %20, %10, %1, %0 | Ayar değil, vergi tablosudur: `baslangic/vergi.json`, ilk okumada bir kez yazılır (karar 0060) |
| Fiyat girişi | Mağaza sahibi | Vergi dahil | — | `fiyatGirisi` (karar 0061) |
| Fiyat gösterimi | Mağaza sahibi | Vergi dahil | — | `fiyatGosterimi`. Girişten farklıysa tutar vergi hesabıyla çevrilir; ürün sayfasında mağaza adresinin bölgesiyle (kart 0081, karar 0067) |
| Fiyatın yanındaki metin | Mağaza sahibi | Vergi adından ve gösterimden kurulur: "<vergi adı> dahil" (Türkiye'de kurulan sitede "KDV dahil"); vergi kapalıysa yok | — | `fiyatEkMetni`. Mağaza sahibi kendi metnini yazabilir; boş bırakılırsa metin görünmez |
| Verginin hesaplandığı adres | Mağaza sahibi | Teslimat adresi | — | `vergiAdresi`. Bölgesi vergi tablosunda yoksa mağaza adresi kullanılır (karar 0061) |
| Yuvarlama | Mağaza sahibi | Satır satır | — | `vergiYuvarlama`. Faturadaki satırlarla aynı tutar çıkar |
| Kargonun vergi sınıfı | Mağaza sahibi | Vergisiz | %20 | Ayar değil, vergi tablosunda işaretli sınıftır: başlangıçta `baslangic/vergi.json` içinde `"kargo": true` (karar 0061) |

## Fiyat

| Ayar | Kim değiştirir | Varsayılan | Örnek Mağaza | Not |
|---|---|---|---|---|
| İndirimde eski fiyat olarak son 30 günün en düşük fiyatı | Mağaza sahibi | Açık | — | `indirimdeEnDusukFiyat`. 30 gün indirimin başladığı andan geriye sayılır, önceki indirimler dahildir; bulunan fiyat indirimli fiyattan yüksek değilse ya da o dönemde fiyat yoksa eski fiyat gösterilmez. Kapalıysa eski fiyat indirimden önceki satış fiyatıdır (kart 0081, karar 0067). Yasal dayanağı hukukçuya teyit ettirilecek |

## Ürün

| Ayar | Kim değiştirir | Varsayılan | Örnek Mağaza | Not |
|---|---|---|---|---|
| Galeriye eklenebilen video siteleri | Altyapı sahibi | YouTube ve Vimeo | — | `videoSiteleri`. Boş liste galeride videoyu kapatır. Video müşteriyi o siteye bağladığı için çerez ve gizlilik metinlerini etkiler (kart 0087, karar 0073) |

## Stok

| Ayar | Kim değiştirir | Varsayılan | Örnek Mağaza | Not |
|---|---|---|---|---|
| Tükenen ürün | Mağaza sahibi | Gösterilir ama satılmaz | — | `tukenenUrun`. Seçenekler: göster ama satma, gizle. Gizlenen ürün listelerden, aramadan ve ilgili ürünlerden çıkar; kendi sayfası bağlantıyla açılır, Tükendi yazar, satılmaz (kart 0083, karar 0069) |
| Düşük stok uyarı eşiği | Mağaza sahibi | 5 adet | — | `dusukStokEsigi`. Ürün bazında değiştirilebilir. Eşik dahil, 0 kapatır (kart 0083) |
| "Son X ürün" yazısı | Mağaza sahibi | 5 adet ve altında | — | `sonAdetEsigi`. 0 yazıyı kapatır (kart 0083) |
| Ödeme sırasında stok ayırma süresi | Mağaza sahibi | 15 dakika | — | `stokAyirmaSuresi`, 5–60 dakika. Müşteri "Siparişi onayla"ya basınca sepetin birimleri ayrılır (kullanıcı kararı: sayfa açılınca değil). Ayrılan ürün vitrinde stokta görünür, ödemeye geçen başka müşteriye ayrılmış olduğu söylenir (kart 0213, karar 0140) |

## Sepet ve ödeme

| Ayar | Kim değiştirir | Varsayılan | Örnek Mağaza | Not |
|---|---|---|---|---|
| Üye olmadan alışveriş | Mağaza sahibi | Açık | — | `uyeOlmadanAlisveris`. Kapalıysa ödeme adımı girişe yönlendirir; açıkken müşteri ödeme sırasında isteğe bağlı hesap açar (kart 0213) |
| Telefon zorunlu | Mağaza sahibi | Açık | — | `telefonZorunlu`. Kargo firmaları telefon ister (kart 0213) |
| Havale | Mağaza sahibi | Açık | — | `odemeYontemleri` (yöntemlerin açıklığı ve müşterinin gördüğü sıra, kart 0214, karar 0141). Banka hesabı yoksa ödeme adımında görünmez. Panelde Satış > Ödeme yöntemleri; değiştirmek yalnız mağaza sahibinin (`odeme-yontemi.degistir`, kullanıcı kararı) |
| Ödenmeyen havale siparişinin iptal süresi | Mağaza sahibi | 3 gün | 1 gün (kart 0216: demoda verilen siparişlerin stoğu bir günde geri döner) | `havaleIptalSuresi`, 1–30 gün. Süre sonunda sipariş iptal olur, stok geri döner; ödediğini bildiren müşterinin siparişi iptal olmaz (kullanıcı kararı, kart 0214) |
| Kapıda ödeme | Mağaza sahibi | Kapalı | Açık | `odemeYontemleri`. İsteyen mağaza açar |
| Kartla öde | Mağaza sahibi | Kapalı | Açık (deneme ortamında) | `odemeYontemleri`. Kartla ödeme eklentisinin yöntemi: eklenti kapalıyken ödeme adımında ve panelde yoktur, kayıtlı yeri korunur (kart 0215) |
| Kapıda ödeme seçenekleri | Mağaza sahibi | Nakit | Nakit ve kart | `kapidaOdemeSecenekleri`. Seçenekler: nakit, kart. Müşteri ödeme adımında seçer, kartı kurye çeker; her seçenek ödeme adımında ayrı satırdır (kart 0214) |
| Banka hesapları (havale) | Mağaza sahibi | Yok | İki örnek hesap (geçersiz olmayan deneme IBAN'ları) | `bankaHesaplari`: banka, hesap sahibi, IBAN (doğrulanır, en çok 10). Sipariş alındı sayfasında gösterilir. Panelde Satış > Banka hesapları (kart 0214) |
| Sepete ekleyince | Mağaza sahibi | Yan pencerede sepet | Yan pencerede sepet | Seçenekler: yan pencerede sepet, kısa bildirim, sepet sayfasına git (karar 0132, kart 0212). Şemada `sepeteEkleyince` |
| Ürün sayfasında taksit satırı | Mağaza sahibi | Göster | Göster | Kartla ödeme eklentisinin ayarı (`kartlaOdemeUrunSayfasindaTaksit`, Eklentiler bölümünde); eklenti kapalıyken satır yoktur (karar 0132, kart 0215) |

## Kargo

| Ayar | Kim değiştirir | Varsayılan | Örnek Mağaza | Not |
|---|---|---|---|---|
| Kargo ücreti | Mağaza sahibi | 0 (kargo her zaman ücretsiz) | 49,90 TL, panelden (kart 0216) | Kullanıcı kararı (kart 0212). Fiyatlar gibi vergi dahil ya da hariç girilir. Başlangıçta tek teslimat bölgesi. Şemada `kargoUcreti`, panelde Satış > Kargo (karar 0135) |
| Ücretsiz kargo sınırı | Mağaza sahibi | Yok | 750 TL, panelden (kart 0216) | Bu tutar ve üstündeki sepette kargo ücretsiz. Şemada `ucretsizKargoSiniri` (kart 0212) |
| Ücretsiz kargo sınırının hesaplandığı tutar | Mağaza sahibi | İndirimden sonraki tutar | — | Seçenekler: indirimden önce, indirimden sonra. Şemada `ucretsizKargoTutari` (kart 0212). Kupon indirimine de uygulanır (kart 0312, karar 0185) |
| Kargoya verme süresi | Mağaza sahibi | 1 iş günü | — | Sayı olarak tutulur. Ürün sayfasında "1 iş gününde kargoda" yazar, ön bilgilendirme metnindeki teslim süresi de buradan gelir. Şemada `kargoyaVermeSuresi` (kart 0110); bugün güven şeridinin yer tutucusu okur |
| Kargo firmaları | Mağaza sahibi | Boş liste | Bir deneme firması (açıkça deneme adıyla, `.test` alan adlı takip adresi) | Ad ve takip adresi kalıbı (`{takip numarası}` yerine siparişin takip numarası konur). Siparişi kargoya verirken listeden seçilir; takip bağlantısı müşterinin sipariş sayfasında ve e-postasında görünür. Şemada `kargoFirmalari`, panelde Satış > Sipariş ayarları (kart 0234, karar 0145, 0146). Örnek Mağaza'nın firması "Deneme Kargo" (`takip.deneme-kargo.test`) |

## İade

| Ayar | Kim değiştirir | Varsayılan | Örnek Mağaza | Not |
|---|---|---|---|---|
| İade kargosunu kim öder | Mağaza sahibi | Mağaza | — | `iadeKargosu`. Seçenekler: mağaza, müşteri. İade talebi formunda müşteriye söylenir (kart 0239); iade koşulları metnine buradan girer. Cayma hakkında yasal kuralı hukukçuya teyit ettirilecek |
| Müşterinin kendi iptali | Mağaza sahibi | Ödeme beklenirken | — | `musteriIptali`. Seçenekler: kapalı, ödeme beklenirken, kargoya verilene kadar. Müşteri sipariş sayfasından (hesap ya da takip) onay penceresiyle iptal eder; kartla ödenmişse para kuruluştan döner. Ödemesi havaleyle ya da elden alınmış siparişi müşteri iptal edemez, mağazayla iletişime geçer (kullanıcı kararı, karar 0151) |
| İade talebi süresi | Mağaza sahibi | 14 gün | — | `iadeTalebiSuresi`, 1–365 gün. Teslimden sonra; süre içinde müşteri hesabından ya da sipariş takibinden iade talebi açar. Cayma süresiyle ilişkisi hukukçuya teyit ettirilir (kart 0233 önerisi, karar 0145, 0151) |
| Siparişteki kişisel bilgilerin saklama süresi | Altyapı sahibi | 10 yıl (hukukçu teyidine kadar öneri) | — | Süre sonunda ad, adres, telefon ve e-posta siparişten silinir; tutarlar, ürünler ve vergi dökümü kalır. Ödeme oturumunun kişisel verisi de bu süreye bağlanır Şemada `kisiselVeriSaklamaYili` (1–30 yıl), günlük işle silinir (kullanıcı kararı, karar 0145, 0146; süre kart 0063'te hukukçuya sorulur) |

## Vitrin listeleri ve ürün sayfası

| Ayar | Kim değiştirir | Varsayılan | Örnek Mağaza | Not |
|---|---|---|---|---|
| Masaüstünde filtrenin yeri | Mağaza sahibi | Solda sütun | — | Mağaza sahibinin tema ayarıdır (`urunFiltresi`), panelin tema ekranında seçilir; seçilmemişse temanın görünümü geçerlidir, üç hazır temada solda (kart 0148, karar 0129). Öteki değer: üstte açılır. Tema değişince seçim kalır. Telefonda filtre her zaman yan pencerede (karar 0102, kart 0136) |
| Sayfa geçişi | Mağaza sahibi | Numaralı | — | Öteki değer: "Daha fazla göster". Kategori, marka, etiket ve arama sayfası (karar 0102, kart 0136) |
| Sayfa başına ürün | Mağaza sahibi | 24 | — | Karar 0102, kart 0136 |
| Varsayılan sıralama | Mağaza sahibi | Önerilen | — | Önerilen mağaza sahibinin elle sırasıdır. Seçenekler: önerilen, en yeni, fiyat artan, fiyat azalan (kart 0136) |
| Tükenmiş seçenek | Mağaza sahibi | Üstü çizili, seçilemez | — | `tukenmisSecenek`. Ürün sayfasında tükenmiş beden ya da renk. Öteki değer: gösterilmez (karar 0102, kart 0138) |
| Ürün sayfasında ilk seçim | Mağaza sahibi | Stoğu olan ilk birleşim seçili | — | `secenekOnSecimi`. Öteki değer: müşteri seçene kadar seçimsiz, fiyat aralığı görünür. Adresteki seçim önce gelir (karar 0108, kart 0138) |
| Filtrede kullanılan özellikler | Mağaza sahibi | Hiçbiri | Kumaş | Ayar değil, ürün özelliğinin "filtrede kullanılsın" alanıdır. Fiyat, marka, seçenekler ve stok durumu her zaman filtrededir (karar 0102, kart 0136) |

## Yorumlar

| Ayar | Kim değiştirir | Varsayılan | Örnek Mağaza | Not |
|---|---|---|---|---|
| Yalnız satın alanlar yorum yapabilir | Mağaza sahibi | Açık | Kapalı | `yorumYalnizSatinAlanlar`. Satın almış sayılan: o ürünü içeren teslim edilmiş ya da kısmen iade edilmiş siparişi olan müşteri (karar 0145, 0146). Kapalıyken giriş yapmış her müşteri yazar. Yorumlar her durumda onaydan sonra yayınlanır (karar 0101, 0109, kart 0139) |
| Doğrulanmış alıcı etiketi | Mağaza sahibi | Açık | — | `dogrulanmisAliciEtiketi`. Etiket yorum yazıldığı anda ürünü satın almış müşterinin yorumunda görünür; Örnek Mağaza'nın örnek yorumlarında yoktur (kart 0139, kullanıcı kararı) |

## E-posta

| Ayar | Kim değiştirir | Varsayılan | Örnek Mağaza | Not |
|---|---|---|---|---|
| Gönderen adı | Altyapı sahibi | Mağazanın görünen adı | — | Panelden düzenlenmesi panel işidir |
| Gönderen adresi | Altyapı sahibi | Yok, e-posta gönderilmez | `ornek-magaza@posta.eticaretmagazasi.com` | Alan adı henüz doğrulanmadı, bugün yalnız yerel kutuya gider (karar 0050) |
| Yanıt adresi | Altyapı sahibi | Gönderen adresi | — | |
| Yönetici bildirimlerinin alıcıları | Mağaza sahibi | Boş: mağaza sahibi rolündeki yöneticiler | — | En çok 5 adres (kart 0233 önerisi, karar 0145). Ayar `yoneticiBildirimAlicilari`, panel: Sipariş ayarları > Yönetici bildirimleri; değeri değişiklik kaydına yazılmaz (kart 0241, karar 0154) |
| Açık yönetici bildirimleri | Mağaza sahibi | Hepsi açık | — | Yeni sipariş, havale bildirimi, iade talebi, müşterinin ya da taramanın iptali, düşük ve tükenen stok, onay bekleyen yorum, kartla ödeme uyuşmazlığı ve bekleyen iade; her biri ayrı açılıp kapanır (kart 0233 önerisi, karar 0145). Ayar `kapaliYoneticiBildirimleri` (kapatılanların listesi). Kartla ödemeye bağlı ikisi panelde yalnız eklenti açıkken görünür, eklenti kapalıyken de gider (karar 0155). Stok uyarıları toplanır, saatte en çok bir e-posta (kart 0241, karar 0154) |
| Logo | Mağaza sahibi | Sitenin ilk logosu (`marka/` klasörü), yoksa mağaza adı yazı olarak | Yer tutucu ilk logo (`marka/logo.png`) | Yüklenen logo dosya deposunda; vitrin, panel ve e-posta tek uçtan alır (kart 0073, karar 0059). Yükleme ekranı kart 0094 |

## Tasarım ve marka

| Ayar | Kim değiştirir | Varsayılan | Örnek Mağaza | Not |
|---|---|---|---|---|
| Mağaza sahibi temayı değiştirebilir | Altyapı sahibi | Açık | — | Kapalıyken mağaza sahibi ne temayı ne tema ayarlarını değiştirir, önceki sürüme de dönemez; logo bu ayara bağlı değil (kart 0105, karar 0080) |
| Kullanılabilir temalar | Altyapı sahibi | Bütün hazır temalar | — (bugün tek hazır tema Canlı Çarşı) | İlki sitenin başlangıç temasıdır. Siteye özel tema `tema/` klasöründe durur ve bu listede yazılır (kart 0105) |
| Tema demosu | Altyapı sahibi | Kapalı | Kapalı | Açık sitede ziyaretçi temayı adresten seçip gezer (`?tema=`), vitrinin üstünde demo şeridi ve temalar arası geçiş durur; hesap, giriş, sipariş, yorum ve bildirim yoktur, uçlar da reddeder; site arama motorlarına kapalıdır. Yalnız türü `demo` olan, e-posta göndermeyen ve eklentisi olmayan site açabilir (site doğrulaması). Temaların demosu Tema Galerisi sitesidir (kart 0116, karar 0127) |
| Tema | Mağaza sahibi | Kullanılabilir temaların ilki | Canlı Çarşı | Tema ayarlarıyla birlikte sürüm sürüm saklanır, önceki sürüme tek adımda dönülür (kart 0105) |
| Tema rengi | Mağaza sahibi | Temanın kendi rengi | Temanın kendi rengi | Yalnız temanın açtığı renkler (Canlı Çarşı'da ana renk). Açık temada okunmayan renk kaydedilmez, okunur ton önerilir; koyu temada okunur tonu kullanılır (kart 0105) |
| Tema yazı tipi, köşe ve düğme biçimi | Mağaza sahibi | Temanın kendi değerleri | Temanın kendi değerleri | Temanın seçeneklerinden biri; Canlı Çarşı'nın seçenekleri kart 0114'te |
| Vitrinde altyapı adı | Altyapı sahibi | Kapalı | — | |
| Ana sayfada "Yakında açılıyoruz." yazısı | Altyapı sahibi | Kapalı | Açık | Başlığın altında bilgi yazısı; bakım modu değildir, vitrin açık kalır (kart 0041). Mağaza sahibinin ayarları gelince panele taşınabilir |
| Bakım sayfasının metni | Altyapı sahibi | Boş (ortak metin) | Boş | Bakım sayfasında ortak metnin yerine görünür (kart 0043) |
| Yönetici oturumu | Altyapı sahibi | 24 saat | — | Bu süre boyunca hiç girmezse yeniden giriş ister (kart 0025) |
| Müşteri oturumu | Altyapı sahibi | 30 gün | — | Bu süre boyunca hiç girmezse yeniden giriş ister (kart 0025) |
| Favori sınırı | Altyapı sahibi | 100 | — | `favoriSiniri`. Bir müşterinin favorilerine ekleyebileceği en çok ürün; hesapta ve tarayıcıda aynı. En büyük değer 100 (favoriler sayfasının çerezi, karar 0110, kart 0140) |
| Kayıtta e-posta doğrulaması | Altyapı sahibi | Kapalı | — | Kapalıyken kayıtla oturum açılır, kayıtlı e-posta söylenir. "Açık" davranışı henüz yok, şemada değil (kart 0062, karar 0051). Üyeliği gizli kalması gereken mağazada açılır |
| Vitrinde koyu tema | Mağaza sahibi | Kapalı | Açık | Mağazanın tasarımına göre açılır. Tema ayarlarının parçasıdır, başlangıç değeri `baslangic/tema.json` (kart 0105) |
| Düzen (üst kısım, ana sayfa, alt kısım bölümleri) | Mağaza sahibi | `baslangic/duzen.json`, yoksa başlangıç temasının düzeni | Temanın düzeni (bugün boş; kart 0114) | Sıra, görünürlük, görünüm ve alan değerleri; sürüm sürüm saklanır. Kayda başvuran alanlar başlangıçta boş kalır (kart 0106, karar 0081) |

## Kampanya

| Ayar | Kim değiştirir | Varsayılan | Örnek Mağaza | Not |
|---|---|---|---|---|
| Kupon kodunda büyük-küçük harf | Altyapı sahibi | Fark etmez | — | "kasim50" ile "KASIM50" aynı koddur. Şemada `kuponKoduHarfDuyarli` (kart 0312); kod tekilliği her zaman harf ayrımsız denetlenir (karar 0187) |

## Panel ve içerik

| Ayar | Kim değiştirir | Varsayılan | Örnek Mağaza | Not |
|---|---|---|---|---|
| Panel listelerinde sayfa başına satır | Mağaza sahibi | 25 | — | `panelSayfaBoyu`. Seçenekler: 25, 50, 100. Ürün, sipariş, müşteri ve yazı listeleri; toplu işlem en çok bir sayfaya uygulanır (kart 0258, karar 0157) |
| Sipariş fişinde fiyatlar | Mağaza sahibi | Göster | — | Kapalıyken fişte yalnız ürün, stok kodu ve adet yazar (ör. hediye siparişi). Ayar `fisteFiyatlar`, panelde Sipariş ayarlarının "Sipariş fişi" bölümünde (kart 0270, karar 0157, 0171) |
| Blog | Mağaza sahibi | Kapalı | Açık | Kapalıyken yazılar vitrinde görünmez, `/blog` bulunamadı verir, ana sayfanın blog bölümü çizilmez (kart 0272, karar 0157) |
| Raporun varsayılan dönemi | Mağaza sahibi | Son 30 gün | — | `raporVarsayilanDonem`. Raporlar ve panodaki satış özeti bu dönemle açılır; seçenekler: bugün, son 7 gün, son 30 gün, bu ay, geçen ay (kart 0317, karar 0185 ve 0195). Panelde değiştirildiği yer kart 0334 |
| Okunan panel bildiriminin saklama süresi | Altyapı sahibi | 30 gün | — | Okunmamış bildirim silinmez (kart 0280, karar 0185) |
| Excel dosyasında en çok satır | Altyapı sahibi | 5.000 | 5.000 | `excelSatirSiniri`, 100–50.000. Excel ile toplu ürün işlemleri eklentisi açıksa; bir içe aktarma dosyasının satır sınırı (kart 0315, karar 0185) |

## Eklentiler

| Ayar | Kim değiştirir | Varsayılan | Örnek Mağaza | Not |
|---|---|---|---|---|
| Açık eklentiler | Altyapı sahibi | Hiçbiri | Stoğa gelince haber ver, kartla ödeme, Excel ile toplu ürün işlemleri | `eklentiler`, eklenti kodlarının listesi (`ayarlar.json`). Kurulu eklenti listede yoksa kapalıdır (kart 0144, karar 0117) |
| Stoğa gelince haber ver: üye olmayan müşteri de isteyebilir | Mağaza sahibi | Açık | — | `stokBildirimiUyeOlmayan`. Kapalıysa formda giriş bağlantısı görünür; giriş yapmış müşteri hesabının e-postasıyla ister (kart 0144) |
| Stoğa gelince haber ver: talep saklama süresi | Mağaza sahibi | 90 gün | — | `stokBildirimiSaklamaGun`, 1–365. Süresi dolan talep, e-postası gitmemiş olsa da silinir (kart 0144) |
| Kartla ödeme: ödeme kuruluşunun ortamı | Altyapı sahibi | Deneme | Deneme | `kartlaOdemeOrtami` (`deneme`, `canli`). Canlı ortam gerçek ödeme alır, mağazanın sözleşmesi ve anahtarlarıyla, kullanıcının onayıyla açılır. Anahtarlar gizli bilgidir (`KARTLA_ODEME_ANAHTARI`, `KARTLA_ODEME_GIZLI_ANAHTARI`) (kart 0215, karar 0142) |
| Kartla ödeme: ürün sayfasında taksit satırı | Mağaza sahibi | Göster | Göster | `kartlaOdemeUrunSayfasindaTaksit`. "Kartla N taksite kadar · Taksit seçenekleri" (karar 0132) |
| Kartla ödeme: en çok taksit | Mağaza sahibi | 12 | 6 | `kartlaOdemeEnCokTaksit`: 1, 2, 3, 6, 9, 12. 1 yalnız tek çekimdir (kart 0215) |
