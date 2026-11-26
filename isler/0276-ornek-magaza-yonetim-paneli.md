# 0276 · Örnek Mağaza yönetim paneliyle yayında

## Amaç

Bölümün sonunda Örnek Mağaza yeni çekirdek sürümüne geçer: mağaza sahibi ürünlerini, siparişlerini, müşterilerini, blog yazılarını, sayfalarını ve ekibini panelden yönetir. "Canlı" bugünkü deneme adresidir (karar 0101); gerçek alan adına geçilmez.

Bölüm: Yönetim paneli. Bölümün son işi. Önce bu bölümün öteki kartları bitmiş olmalı.

## Olmazsa olmazlar

- Yayından önce kullanıcıya sorulur: 0257'de önerilen site ayarlarının Örnek Mağaza değerleri, örnek blog yazıları ve sabit sayfaların başlangıç verisine girip girmeyeceği.
- Örnek Mağaza demo sitedir: gerçek ödeme almaz, arama motorlarına kapalı kalır (karar 0007).
- Kimlik yeni çekirdek sürümüne çıkar, sürüm notu yazılır, sitenin testleri çalışır.
- Veritabanı değişiklikleri yayın komutuyla uygulanır; yeni ayarların kurulu veritabanına girişi ölçülür (kart 0069'un kuralı).
- Yayından sonra sağlık kontrolü, sunucu denetimi ve deneme adresinde tarayıcıyla gezinti, telefon ve bilgisayarda: ürün ekleme (varyant, fiyat, stok, görsel) ve vitrinde görülmesi, sipariş listesi ve ayrıntısı, adres düzeltme, sipariş fişi, müşteri ayrıntısı ve not, yorum onayı ve vitrinde görünmesi, mağaza bilgilerinin değişip alt kısımda görünmesi, blog yazısı ve sabit sayfanın menüde görülmesi, tema ayarı ve geri dönüş, ekibe davet ve rol.
- Sunucunun belleği ve işlemcisi paylaşılıyor: aynı anda yalnız bir ağır test ya da tarayıcı çalışır, sistem yükünü bekleyen döngü kurulmaz.

## Sınırlar

- Gerçek alan adına geçilmez, gerçek mağazalara dokunulmaz.

## Bitti sayılır

- Deneme adresinde gezintinin her adımı çalışıyor (karta yazılı).
- Sağlık ve sunucu denetimi yeşil.
- Geri dönüş komutunun bu sürümde çalıştığı biliniyor (yayın denemesi).

## Sonuç

- **Ön soru.** Blog (3 yazı), sabit sayfalar (Hakkımızda ve İletişim yayında, SSS taslak) ve iki panel ayarı (sayfa başına 25 satır, fişte fiyatlar) başlangıç verisine bu hâliyle girdi (kullanıcı kararı).
- **Sürüm.** Çekirdek ve kimlik 0.80.0, sürüm notu (18809c9). Hat 45707129119 yerel ortam denemesinin kuyruk ölçümüyle (kart 0309), hat 45719023764 yönetici bildirimi testinin rastgele kimliğiyle (kart 0310) kırmızıydı; hat 45756746426 (1fc9ffc) yeşil: birim 4244/4244, tarayıcı 369/369 ve 6/6, hız 17/17, yerel ortam 79 ölçüm, 45 dakika.
- **Yayın.** 1fc9ffc'den (sonraki kayıtlar yalnız kart ve tarihçe), ayrık çalışma kopyasında; 0.79.0'dan 0.80.0'a, yayın 16. Kilitler ve hızlı sunucu denetimi geçti, sağlık kontrolü yeşil.
- **Sunucu denetimi.** Tam denetim yeşil; sağlık ucu dışarıdan 0.80.0 ve ayakta veritabanı, deneme adresi IPv4 ve IPv6'da `noindex`.
- **Yayın denemesi.** 17/17 yeşil: bozuk sürümde site eski yayınıyla açık, geri dönüş siteyi ve arka plan sürecini önceki yayına döndürüyor.
- **Yeni ayarların kurulu veritabanına girmesi.** Sıfırlama gerekmedi (kart 0069'un kuralı); blog ve sabit sayfalar açılış kurulumuyla yazıldı (vitrinde `/blog` üç yazı, Hakkımızda ve İletişim 200, SSS 404).
- **Gezinti** (deneme adresinde gerçek tarayıcıyla, bilgisayar 1280 ve telefon 390 px; betik kayda girmedi, geçici yönetici kendi açıp kapattı, kapandıktan sonra şifresi 401; son çalışmada 30/30):
  - Ürün: panelden taslak ürün, Renk seçeneği (Kırmızı 449,90 stok 7, Mavi 479,90 stok 4), görsel ve alternatif metni, yayına alma; vitrinde birleşim değişince fiyat ve stok kodu değişiyor. Sonunda onayla silindi, adresi 404.
  - Sipariş: yeni müşteri havaleyle ORN-1010; panelde liste ve ayrıntı, havale onayı, "Düzelt" ile adres düzeltme ve geçmişte önceki bilgi (sunucuda gönderen olmadığı için e-posta kutusu yok), fiş yeni sekmede düzeltilmiş adresle, kargoya verme (sonra "Düzelt" yok), teslim.
  - Müşteri ayrıntısı ve not; müşterinin yorumu panelde yayınlandı, ürün sayfasında "Deniz G." ile görünüyor.
  - Mağaza bilgileri: Instagram hesabı alt kısımda göründü, sonra eski değerine (boş) döndü.
  - Tema ayarı: köşe "Keskin" vitrinde göründü, "Önceki hâline dön" ile vitrin stili eskisiyle aynı.
  - Ekip: İçerik editörü daveti kabul edildi, iki aşamalı kurulum, yalnız rolünün menüsü; rol Sipariş görevlisi olunca açık oturumda izinler hemen değişti; hesap onayla kapatıldı, şifresi 401.
  - Telefon ve bilgisayarda 68 sayfa ölçümünde yana kayma, beklenmeyen konsol hatası ve 400+ yanıt yok (404'ler beklenen yerlerde: taslak SSS, yetkisiz panel sayfası, silinen ürün).
  - Sabit sayfalar ilk gezintide hiçbir menüde yoktu: başlangıç menüleri yalnız ilk kurulumda yazılır (kart 0107), alt kısmın "Kurumsal" sütunu sonradan eklendiği için canlı demoya girmemişti. Kullanıcı kararıyla panelin Menüler ekranından başlangıç dosyasındaki gibi eklendi (Alışveriş ile Sözleşmeler arasında, Hakkımızda ve İletişim); vitrinin alt kısmında bilgisayar ve telefonda görünüyor ve sayfaları açıyor.
- Demoda kalan: ORN-1009 (ödeme bekliyor, havale süresi dolunca kendiliğinden iptal olur) ve ORN-1010 (teslim edildi), iki gezinti müşteri hesabı (`gezinti-musteri-9d11f96146@ornek.test`, `gezinti-musteri-d29eaa5482@ornek.test`), Porselen Kupa'da bir yorum, galeriye bağlanmamış bir yüklenmiş görsel (temizliği kart 0093).

## Durum

yapılacak
