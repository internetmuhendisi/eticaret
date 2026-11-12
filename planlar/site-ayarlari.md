# Site ayarları (taslak)

Siteden siteye değişebilen davranışların listesi. Her yeni site bu varsayılan değerlerle başlar, kurulurken gerekenler değiştirilir. Bu dosya bir taslaktır, plan aşamasında çekirdeğin ayar şemasına dönüşür (`.claude/rules/ayarlar.md`).

Durum: 2026-10-28 tarihinde kullanıcı onayıyla yazıldı. Aynı gün ilk site Örnek Mağaza'nın değerleri eklendi (karar 0007) ve üç yeni ayar girdi: kapıda ödeme seçenekleri, kargoya verme süresi, iade kargosunu kim öder (karar 0008). "Örnek Mağaza" sütununda "—" yazan ayar varsayılanla çalışır. Aynı gün her ayara "Kim değiştirir" sütunu eklendi (karar 0010): altyapı sahibinin ayarları site klasöründe durur ve yayınla değişir, mağaza sahibinin ayarları panelden değişir, site klasöründe yalnız başlangıç değerleri durur (`planlar/cekirdek-ve-siteler.md`). Aynı gün altyapı sahibinin ayarları çekirdeğin ayar şemasına girdi (kart 0010). Bu ayarların asıl yeri artık `cekirdek/ayar-semasi/ayarlar.ts` dosyasıdır; buradaki tablo değişirse şema da aynı değişiklikte güncellenir. 2026-11-07'de mağaza sahibinin ayarlarının yeri kuruldu (kart 0069, karar 0055): şemada `magazaAyarSemasi`, değerler sitenin veritabanında, başlangıç değerleri site klasöründe `baslangic/ayarlar.json`. Aşağıda "Mağaza sahibi" yazan ayarlar şemaya kendi kartlarıyla girer.

## Örnek Mağaza

İlk demo sitesi. Gerçek satış yapmaz, her özellik önce onda denenir (karar 0007).

- Kategoriler: Giyim (tişört, sweatshirt; beden ve renk seçenekli), Ev ve Yaşam (mum, vazo, kupa), Elektronik Aksesuar (şarj kablosu, telefon kılıfı, kulaklık). Özel kurallı ürün yok.
- Ürünler demoda %20 KDV sınıfıyla girilir. Giyimin doğru oranı gerçek mağazada muhasebeciye sorulur.
- Kargo ücreti ve ücretsiz kargo sınırı sonra panelden girilir.

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
| Sipariş numarası öneki | Altyapı sahibi | Mağaza adından 3 harf | ORN | Kurulumda mağaza adından önerilir |
| Sipariş numarası başlangıcı | Altyapı sahibi | 1001 | — | |
| Mağaza adı | Mağaza sahibi | Kimlikteki görünen ad | — | Vitrinde, panelde ve e-postalarda görünür; kimlikteki ad altyapının iç adıdır, bakım sayfası onu gösterir (kart 0071, karar 0057) |
| İletişim e-postası | Mağaza sahibi | Boş | `iletisim@ornek-magaza.test` | Değeri değişiklik kaydına yazılmaz |
| İletişim telefonu | Mağaza sahibi | Boş | `+90 312 000 00 00` | Ülke koduyla. Değeri değişiklik kaydına yazılmaz |
| Mağaza adresi | Mağaza sahibi | Boş | Ankara / Çankaya, Deneme Sokak No: 1, 06000 | Ülke, il, ilçe (listeden), adres, posta kodu. Değeri değişiklik kaydına yazılmaz. Örnek Mağaza'nınki deneme değeridir |
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
| Ödeme sırasında stok ayırma süresi | Mağaza sahibi | 15 dakika | — | |

## Sepet ve ödeme

| Ayar | Kim değiştirir | Varsayılan | Örnek Mağaza | Not |
|---|---|---|---|---|
| Üye olmadan alışveriş | Mağaza sahibi | Açık | — | |
| Telefon zorunlu | Mağaza sahibi | Açık | — | Kargo firmaları telefon ister |
| Havale | Mağaza sahibi | Açık | — | |
| Ödenmeyen havale siparişinin iptal süresi | Mağaza sahibi | 3 gün | — | Süre sonunda stok geri döner |
| Kapıda ödeme | Mağaza sahibi | Kapalı | Açık | İsteyen mağaza açar |
| Kapıda ödeme seçenekleri | Mağaza sahibi | Nakit | Nakit ve kart | Seçenekler: nakit, kart. Müşteri ödeme adımında seçer, kartı kurye çeker |

## Kargo

| Ayar | Kim değiştirir | Varsayılan | Örnek Mağaza | Not |
|---|---|---|---|---|
| Ücretsiz kargo sınırının hesaplandığı tutar | Mağaza sahibi | İndirimden sonraki tutar | — | Seçenekler: indirimden önce, indirimden sonra |
| Kargoya verme süresi | Mağaza sahibi | 1 iş günü | — | Sayı olarak tutulur. Ürün sayfasında "1 iş gününde kargoda" yazar, ön bilgilendirme metnindeki teslim süresi de buradan gelir. Şemada `kargoyaVermeSuresi` (kart 0110); bugün güven şeridinin yer tutucusu okur |

## İade

| Ayar | Kim değiştirir | Varsayılan | Örnek Mağaza | Not |
|---|---|---|---|---|
| İade kargosunu kim öder | Mağaza sahibi | Mağaza | — | Seçenekler: mağaza, müşteri. İade koşulları metnine buradan girer. Cayma hakkında yasal kuralı hukukçuya teyit ettirilecek |

## Vitrin listeleri ve ürün sayfası

| Ayar | Kim değiştirir | Varsayılan | Örnek Mağaza | Not |
|---|---|---|---|---|
| Masaüstünde filtrenin yeri | Mağaza sahibi | Solda sütun | — | Temanın görünüm seçeneğidir (kart 0136: bugün tema belirler); mağaza sahibinin seçimi tema ekranıyla tema ayarlarına girer (kart 0148). Öteki değer: üstte açılır. Telefonda filtre her zaman yan pencerede (karar 0102, kart 0136) |
| Sayfa geçişi | Mağaza sahibi | Numaralı | — | Öteki değer: "Daha fazla göster". Kategori, marka, etiket ve arama sayfası (karar 0102, kart 0136) |
| Sayfa başına ürün | Mağaza sahibi | 24 | — | Karar 0102, kart 0136 |
| Varsayılan sıralama | Mağaza sahibi | Önerilen | — | Önerilen mağaza sahibinin elle sırasıdır. Seçenekler: önerilen, en yeni, fiyat artan, fiyat azalan (kart 0136) |
| Tükenmiş seçenek | Mağaza sahibi | Üstü çizili, seçilemez | — | `tukenmisSecenek`. Ürün sayfasında tükenmiş beden ya da renk. Öteki değer: gösterilmez (karar 0102, kart 0138) |
| Ürün sayfasında ilk seçim | Mağaza sahibi | Stoğu olan ilk birleşim seçili | — | `secenekOnSecimi`. Öteki değer: müşteri seçene kadar seçimsiz, fiyat aralığı görünür. Adresteki seçim önce gelir (karar 0108, kart 0138) |
| Filtrede kullanılan özellikler | Mağaza sahibi | Hiçbiri | Kumaş | Ayar değil, ürün özelliğinin "filtrede kullanılsın" alanıdır. Fiyat, marka, seçenekler ve stok durumu her zaman filtrededir (karar 0102, kart 0136) |

## Yorumlar

| Ayar | Kim değiştirir | Varsayılan | Örnek Mağaza | Not |
|---|---|---|---|---|
| Yalnız satın alanlar yorum yapabilir | Mağaza sahibi | Açık | — | |
| Doğrulanmış alıcı etiketi | Mağaza sahibi | Açık | — | |

## E-posta

| Ayar | Kim değiştirir | Varsayılan | Örnek Mağaza | Not |
|---|---|---|---|---|
| Gönderen adı | Altyapı sahibi | Mağazanın görünen adı | — | Panelden düzenlenmesi panel işidir |
| Gönderen adresi | Altyapı sahibi | Yok, e-posta gönderilmez | `ornek-magaza@posta.eticaretmagazasi.com` | Alan adı henüz doğrulanmadı, bugün yalnız yerel kutuya gider (karar 0050) |
| Yanıt adresi | Altyapı sahibi | Gönderen adresi | — | |
| Logo | Mağaza sahibi | Sitenin ilk logosu (`marka/` klasörü), yoksa mağaza adı yazı olarak | Yer tutucu ilk logo (`marka/logo.png`) | Yüklenen logo dosya deposunda; vitrin, panel ve e-posta tek uçtan alır (kart 0073, karar 0059). Yükleme ekranı kart 0094 |

## Tasarım ve marka

| Ayar | Kim değiştirir | Varsayılan | Örnek Mağaza | Not |
|---|---|---|---|---|
| Mağaza sahibi temayı değiştirebilir | Altyapı sahibi | Açık | — | Kapalıyken mağaza sahibi ne temayı ne tema ayarlarını değiştirir, önceki sürüme de dönemez; logo bu ayara bağlı değil (kart 0105, karar 0080) |
| Kullanılabilir temalar | Altyapı sahibi | Bütün hazır temalar | — (bugün tek hazır tema Canlı Çarşı) | İlki sitenin başlangıç temasıdır. Siteye özel tema `tema/` klasöründe durur ve bu listede yazılır (kart 0105) |
| Tema | Mağaza sahibi | Kullanılabilir temaların ilki | Canlı Çarşı | Tema ayarlarıyla birlikte sürüm sürüm saklanır, önceki sürüme tek adımda dönülür (kart 0105) |
| Tema rengi | Mağaza sahibi | Temanın kendi rengi | Temanın kendi rengi | Yalnız temanın açtığı renkler (Canlı Çarşı'da ana renk). Açık temada okunmayan renk kaydedilmez, okunur ton önerilir; koyu temada okunur tonu kullanılır (kart 0105) |
| Tema yazı tipi, köşe ve düğme biçimi | Mağaza sahibi | Temanın kendi değerleri | Temanın kendi değerleri | Temanın seçeneklerinden biri; Canlı Çarşı'nın seçenekleri kart 0114'te |
| Vitrinde altyapı adı | Altyapı sahibi | Kapalı | — | |
| Ana sayfada "Yakında açılıyoruz." yazısı | Altyapı sahibi | Kapalı | Açık | Başlığın altında bilgi yazısı; bakım modu değildir, vitrin açık kalır (kart 0041). Mağaza sahibinin ayarları gelince panele taşınabilir |
| Bakım sayfasının metni | Altyapı sahibi | Boş (ortak metin) | Boş | Bakım sayfasında ortak metnin yerine görünür (kart 0043) |
| Yönetici oturumu | Altyapı sahibi | 24 saat | — | Bu süre boyunca hiç girmezse yeniden giriş ister (kart 0025) |
| Müşteri oturumu | Altyapı sahibi | 30 gün | — | Bu süre boyunca hiç girmezse yeniden giriş ister (kart 0025) |
| Kayıtta e-posta doğrulaması | Altyapı sahibi | Kapalı | — | Kapalıyken kayıtla oturum açılır, kayıtlı e-posta söylenir. "Açık" davranışı henüz yok, şemada değil (kart 0062, karar 0051). Üyeliği gizli kalması gereken mağazada açılır |
| Vitrinde koyu tema | Mağaza sahibi | Kapalı | Açık | Mağazanın tasarımına göre açılır. Tema ayarlarının parçasıdır, başlangıç değeri `baslangic/tema.json` (kart 0105) |
| Düzen (üst kısım, ana sayfa, alt kısım bölümleri) | Mağaza sahibi | `baslangic/duzen.json`, yoksa başlangıç temasının düzeni | Temanın düzeni (bugün boş; kart 0114) | Sıra, görünürlük, görünüm ve alan değerleri; sürüm sürüm saklanır. Kayda başvuran alanlar başlangıçta boş kalır (kart 0106, karar 0081) |
