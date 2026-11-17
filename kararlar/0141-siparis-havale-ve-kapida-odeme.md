# 0141 · Sipariş, havale ve kapıda ödeme

## Tarih

2026-11-17

## Karar

Kart 0214 ile müşteri ödeme adımının sonunda havale ya da kapıda ödemeyle (nakit ya da kartla) sipariş verir. "Siparişi onayla" ödeme oturumunu (karar 0140), stok ayırmasını ve siparişi **tek işlemde** yazar (`odemeServisi.siparisVer`). Yalnız oturum açan yol (`odemeOturumuAc`) kartla ödeme için kalır (kart 0215): orada sipariş bankadan dönüşte aynı işlevle (`siparisServisi.siparisiKur`) kurulur.

Kullanıcının kararları (kart 0214):

| Soru | Karar |
|---|---|
| Ödediğini bildiren müşterinin havale siparişi süre dolunca iptal olsun mu? | Olmasın. Bildirimli sipariş mağaza sahibi bakana kadar "ödeme bekleniyor"da kalır; bildirimi panelde görmek ve havaleyi onaylamak on üçüncü bölümde. |
| Ödeme yöntemlerini ve banka hesaplarını kim değiştirir? | Yalnız mağaza sahibi. Görevli görür, değiştiremez (IBAN'ın değişmesi paranın başka hesaba gitmesidir). İki izin: `odeme-yontemi.gor` (görevli ve mağaza sahibi), `odeme-yontemi.degistir` (mağaza sahibi). |

Teknik kurallar:

- **Sipariş** (`cekirdek/moduller/siparis/`): sipariş, kalemleri, geçmişi ve havale bildirimleri ayrı tablolardadır. Siparişte o anki her şey durur: kalemde ürün adı, seçim, stok kodu, adet, gösterim biçiminde birim fiyat ve satır tutarı, vergisiz tutar, vergi ve oranlar (adlarıyla); siparişte kargo türü ve tutarı, ara toplam, vergi toplamı ve dökümü (vergi adıyla), toplam, teslimat, fatura, not, metin sürümüyle onaylar, ödeme yöntemi ve kapıda ödemenin seçeneği. Tutarlar sepetin tek hesabından gelir (`sepetiHesapla`); hesap satıra vergi ayrıntısını da verir. Sipariş ve kalemleri silinmez.
- **Numara:** sitenin öneki ve başlangıcı (altyapı sahibinin ayarları `siparisOneki`, `siparisBaslangici`) ile veritabanının sırasından (`siparis_numarasi`): başlangıç eksi bir artı sıra. Numara tam yazılışıyla saklanır (önek sonradan değişse de eski numara aynı kalır) ve tekildir. Geri alınan işlemin numarası boşta kalır. Başlangıç ayarı ilk siparişten sonra değiştirilmez (yalnız disiplin: değişirse eski numarayla çakışan sipariş tekil indekste düşer).
- **Durumlar** kayıttadır (`cekirdek/kayitlar/siparis.ts`): bu kartta "ödeme bekleniyor" ve "iptal"; geçişler aynı tanımdadır. Her değişiklik geçmişe kim, ne zaman, neden ile yazılır; geçmiş değiştirilemez (tetikleyici). Üye olmayan müşterinin siparişi geçmişe `uye-olmayan-musteri`, süre dolunca iptal `havale-suresi` sistem adıyla yazılır.
- **Stok:** `stokDus` "yeterliyse düş" koşulunda başka oturumların süresi dolmamış ayırmalarını stoktan düşülmüş sayar; siparişin kendi oturumu sayılmaz, ayırması siparişe geçer (silinir). Düşürme stok satırını koşuldan önce kilitler: koşuldaki ayırma toplamı alt sorgudur ve kilit beklendikten sonra yeniden okunmaz (bağımsız kontrolün bulgusu; kart 0215'te sipariş ayrı işlemde kurulacağı için gerekir). Aynı oturumdan ikinci sipariş kurulmaz (tekil indeks, `cakisma`). Siparişe dönen oturum ödeme oturumu temizliğinde ve müşterinin yeniden onayında silinmez.
- **Ödeme yöntemleri** kayıttadır (`odemeYontemleri`, `kapidaOdemeSecenekleri`, `cekirdek/kayitlar/odeme.ts`). Açık olup olmadıkları ve sıraları, kapıda ödemenin seçenekleri, havalenin iptal süresi (gün, 1–30, varsayılan 3) ve banka hesapları mağaza sahibinin ayarlarıdır; kendi işlevleriyle değişir (`odemeYontemiServisi`, ayarlar `kendiIsleviyle`). Listede olmayan yöntem kapalıdır, sonda okunur. Müşterinin kullanabileceği en az bir yöntem kalır: banka hesabı olmayan havale sayılmaz; bu durumu doğuran kaydetme (`en-az-bir-yontem`) ve son hesabın silinmesi (`son-yontem`) reddedilir. Müşteri ödeme adımında açık yöntemleri sırasıyla görür; havale yalnız banka hesabı varken, kapıda ödemenin her seçeneği ayrı satırdır. Kapalı yöntemle sipariş verilmez (`yontem-kapali`).
- **Banka hesabı:** banka, hesap sahibi ve IBAN. IBAN ISO 13616'nın biçimi ve 97'ye göre kontrol hanesiyle, ülkenin veri dosyasında uzunluk yazılıysa (`ibanUzunlugu`, Türkiye 26) uzunlukla doğrulanır (`cekirdek/bolgeler/iban.ts`); boşluksuz saklanır. Aynı numara iki kez eklenmez, en çok 10 hesap. Hesaplar kayıtta gizli değildir: her müşteriye gösterilir, değişikliği kayıtta görülmelidir.
- **Havalenin iptali:** bir siparişin iptali hata verirse hata kaydedilir, tarama sonrakilerle sürer. Saatlik zamanlı iş (`havale-iptali`) süresi dolmuş, ödeme bekleyen, bildirimsiz havale siparişlerini iptal eder; stok yalnız o siparişin stok geçmişinde düşürdüğü kadar geri konur. Her sipariş kendi işleminde, satır kilidiyle (SKIP LOCKED) ve kilitten sonra yeniden sınanan koşulla: aynı sipariş iki kez iptal edilmez. Arka plan sürecinin yüklediği iptal kodu sipariş servisinden ayrı dosyadadır (`iptal.ts`).
- **Sipariş alındı sayfası** (`/siparis-alindi`): siparişi veren tarayıcıya rastgele bir erişim anahtarı verilir (çerez `siparis-erisim`, yalnız bu yola, HttpOnly, bir gün); veritabanında anahtarın SHA-256 özeti durur. Sayfa siparişi yalnız bu anahtarla okur; yoksa bulunamadı. Havalede son ödeme anı, tutar, açıklamaya yazılacak numara, hesaplar ("IBAN'ı kopyala") ve "Ödemeyi yaptım, bildir"; kapıda ödemede seçenek ve kargoya verme süresi.
- **Havale bildirimi** (`/havale-bildirimi`): üye olmayan müşteri numara ve siparişteki e-postayla (robot korumalı, sıkı sınırlı uç), üye kendi siparişi için (müşteri ucu) bildirir. Numara ile e-posta eşleşmezse bulunamadı döner: siparişin var olup olmadığı belli olmaz. Yalnız ödeme bekleyen havale siparişine yazılır; hesap bildirim anındaki banka ve numarayla saklanır. Bir siparişe en çok 5 bildirim yazılır, ödeme günü siparişten önce ya da ileri bir tarih olamaz.
- **Üyenin önceki adresi:** giriş yapmış müşterinin son siparişinin teslimatı ödeme adımında önerilir (`GET /kapi/musteri/son-teslimat`); "Bu adresi kullan" alanları doldurur.
- **Panel:** "Satış" altında "Ödeme yöntemleri" (anahtar parçasıyla açma-kapama, sıralanabilir liste, kapıda seçenekleri, iptal süresi; birlikte kaydedilir) ve "Banka hesapları" (yan pencerede ekleme ve düzenleme, onayla silme, hemen kaydedilen sıralama). Açma-kapama için kütüphaneye `Anahtar` (Radix Switch) eklendi; seçenek grubuna ödeme yöntemi için kart görünümü.

## Neden

- Havale ve kapıda ödemede dışarıda bir ödeme adımı yoktur: oturum ve siparişi tek işlemde yazmak, ayrılmış ama siparişe dönmemiş stok ve yarım kalmış oturum bırakmaz. Kartla ödemenin yolu ayrı kaldığı için kart 0215 aynı `siparisiKur`'u bankadan dönüşte çağırır.
- Bildirimli siparişi kendiliğinden iptal etmek, parası yatmış bir siparişin iptal olup stoğunun başkasına satılmasına yol açabilirdi (kullanıcı kararı).
- Banka hesabını değiştirebilen kişi paranın gittiği hesabı değiştirir: bu yalnız mağaza sahibinin işidir (kullanıcı kararı).
- Numaranın veritabanının sırasından gelmesi aynı anda gelen siparişleri kilitle sıraya koymadan tekil numara verir.
- Erişim anahtarının özeti saklanır: veritabanı okunsa da sipariş alındı sayfası açılamaz. Çerez yalnız o sayfanın yoluna gider.
- Yöntem ayarlarını mağaza ayarı olarak tutmak yeni bir tablo ve ayrı değişiklik kaydı gerektirmez; değişiklik kaydı ve aynı kalan değerin yazılmaması mağaza ayarları servisinden gelir.

## Düşünülen diğer yollar

- **Önce oturum, sonra ikinci istekte sipariş:** Kartla ödemenin akışına benzerdi, ama havalede iki istek arasında kalan oturum ve ayırma için ayrı temizlik ve hata ekranı gerekirdi.
- **Numara için sayaç satırı ve kilit:** Başlangıç değişince kayardı ama bütün siparişler tek satırın kilidinde sıraya girerdi.
- **Sipariş alındı sayfasında numarayla erişim (`/siparis/ORN-1001`):** Numara tahmin edilebilir; sayfa kişisel veri gösterir. Adreste anahtar taşımak da anahtarı geçmişe ve yönlendirme başlığına düşürürdü.
- **Banka hesapları için ayrı tablo:** Hesap sayısı küçüktür, sıralama ve değişiklik kaydı mağaza ayarlarında zaten vardır.
- **Kapıda ödemenin ek ücreti:** Kartta yoktur; ihtiyaç olursa site ayarı olarak ayrı kartla gelir.

## Sonuçları

- Ödediğini bildiren müşterinin siparişi kendiliğinden iptal olmadığı için stoğu, mağaza sahibi bakana kadar düşmüş kalır. Bildirimi görecek ve siparişi elle iptal edecek ekran on üçüncü bölümdedir; o zamana kadar bildirim yalnız veritabanında görünür. Bildirim sayısı sınırlıdır ama numarayı ve e-postayı bilen biri gerçek ödeme olmadan bildirim yazabilir.
- Sipariş alındı sayfası ve bildirim formu mağazanın bugünkü banka hesaplarını gösterir, siparişe hesap saklanmaz: kapatılmış bir hesaba para gönderilmesin. Mağaza sahibi bir IBAN'ı değiştirirse sayfayı yenileyen müşteri yeni hesabı görür.
- Sipariş numarası siparişten sonra yalnız sipariş alındı sayfasında görünür ve sayfa yalnız erişim çereziyle açılır: tarayıcı çerezi yazmazsa müşteri numarayı göremez (sipariş e-postası on üçüncü bölümde). Aynı tarayıcıdan ikinci sipariş verilince ilkinin sayfası açılmaz.
- Banka hesabı işlemleri (ekle, değiştir, sil) listeyi okuyup bütün olarak yazar; aynı anda iki işlemde sonra yazan kazanır. Ekranı yalnız mağaza sahibi kullanır; yalnız disiplindir.

- Sipariş kalıcıdır: geçmiş tetikleyicisi ve kısıtlar yüzünden sipariş, kalemleri ve siparişe dönen oturum silinemez. Tarayıcı testlerinin siparişleri paylaşılan yerel veritabanında birikir (hattın veritabanı her çalışmada yenidir).
- Siparişe dönen ödeme oturumu da kişisel veriyi (adres, e-posta) siparişle birlikte taşımaya devam eder; saklama süresi siparişin saklama süresiyle birlikte on üçüncü bölümde ele alınır.
- Havale bildirimi panelde henüz görünmez ve e-posta gönderilmez (on üçüncü bölüm). Bildirimli sipariş o zamana kadar "ödeme bekleniyor"da bekler.
- "Yalnız satın alanlar yorum yapabilir" denetimi siparişe bağlanmadı (kartın sınırı): hangi durumun "satın aldı" sayılacağı on üçüncü bölümde.
- Alt kısmın ödeme işaretleri bölümü (`odemeIsaretleri`) hâlâ ödeme işlevinin kapalı olmasına bağlıdır; açık yöntemlerden işaret üretmek ayrı bir iştir.
- Sipariş alındı sayfası hız ölçümüne girmez (erişim çerezi ister); taraması ödeme testindedir.
- Ödeme yöntemi ayarlarının ekranı ve vitrin aynı ayarı okur: mağaza sahibi bir yöntemi kapatınca açık ödeme sayfası eski listeyle durur, onay "yontem-kapali" ile reddedilir ve müşteri sayfayı yeniler.
