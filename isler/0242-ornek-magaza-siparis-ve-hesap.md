# 0242 · Örnek Mağaza siparişi yönetiyor, müşteri hesabı açık

## Amaç

Bölümün sonunda Örnek Mağaza yeni çekirdek sürümüne geçer: deneme adresinde müşteri hesabını kullanır, siparişini takip eder, iade ister; mağaza sahibi siparişi panelden yönetir. "Canlı" bugünkü deneme adresidir (karar 0101); gerçek alan adına geçilmez.

Bölüm: Sipariş ve müşteri hesabı. Bölümün son işi. Önce bu bölümün öteki kartları (0233–0241; 0187 ve 0095 onların içinde) bitmiş olmalı.

## Olmazsa olmazlar

- Yayından önce kullanıcıya sorulur:
  - 0233'te önerilen site ayarlarının Örnek Mağaza değerleri (müşteri iptali, iade talebi süresi, yönetici bildirimlerinin alıcısı, kargo firmaları);
  - demoda verilen eski siparişlerin (kart 0216'nın ORN-1001 ve ORN-1002 gibi bildirimli siparişler) ne olacağı: panelden iptal, sıfırlama (karar 0100) ya da olduğu gibi kalması;
  - sunucuda gerçek e-posta gönderimi olmadığı için (kart 0060) e-postaların demoda nasıl gösterileceği.
- Örnek Mağaza demo sitedir: gerçek ödeme almaz, arama motorlarına kapalı kalır (karar 0007).
- Kimlik yeni çekirdek sürümüne çıkar, sürüm notu yazılır, sitenin testleri çalışır.
- Veritabanı değişiklikleri yayın komutuyla uygulanır; yeni ayarların kurulu veritabanına girişi ölçülür (kart 0069'un kuralı).
- Yayından sonra sağlık kontrolü, sunucu denetimi ve deneme adresinde tarayıcıyla gezinti, telefon ve bilgisayarda: kayıt ve giriş, hesabım, adres ekleme, ödemede kayıtlı adres, havaleyle sipariş, siparişlerim, üye olmayanın takibi; panelde havale onayı, kargoya verme, teslim, kısmi iade; müşterinin iade talebi ve onayı.
- Sunucunun belleği ve işlemcisi paylaşılıyor: aynı anda yalnız bir ağır test ya da tarayıcı çalışır, sistem yükünü bekleyen döngü kurulmaz.

## Sınırlar

- Gerçek alan adına geçilmez, gerçek mağazalara dokunulmaz.
- Panelin tam sipariş ekranları on dördüncü bölümdedir.

## Bitti sayılır

- Deneme adresinde müşteri hesabı, siparişlerim, takip ve iade talebi çalışıyor; mağaza sahibi siparişi kargoya verip iade yapabiliyor (gezinti, karta yazılı).
- Sağlık ve sunucu denetimi yeşil.
- Geri dönüş komutunun bu sürümde çalıştığı biliniyor (yayın denemesi).

## Yayın (2026-11-20)

Kullanıcı kararları:
- **Ayarlar:** önerilen değerler; hepsi varsayılan ya da başlangıç dosyasında, dosya değişmedi. Müşteri yalnız ödeme beklenirken iptal eder, iade talebi teslimden sonra 14 gün açık, iade kargosunu mağaza öder, yönetici bildirimleri mağaza sahibi rolündekilere gider, kargo firması "Deneme Kargo".
- **Eski siparişler** (ORN-1001, ORN-1002 ve öncekiler): olduğu gibi kalır.
- **E-postalar:** demoda gösterilmez; sunucuda gönderen yok (kart 0060), sipariş alındı sayfası "e-postanıza gönderdik" demez.

Yapılanlar:
- **Sürüm.** Çekirdek ve kimlik 0.79.0 (fd9b057); sürüm notu, sitenin testleri (51), komut testleri, site doğrulaması geçti. Veritabanı değişiklikleri 0047, 0048, 0049 bu yayınla geldi.
- **Hat.** 44762439752 (575cd07) iki denemede de 90 dakikalık sınırda kesildi, test düşmedi; sınır kart 0255 ile 150 dakika oldu. Yayın 44802690490'ın yeşil geçtiği 6b53ef4'ten yapıldı (68 dakika).
- **Yayın.** 0.78.0'dan 0.79.0'a, yayın 15. Yayından önceki hızlı sunucu denetimi yeşil; sağlık ucu dışarıdan 0.79.0 ve ayakta veritabanını söylüyor.
- **Sunucu denetimi.** Tam denetim yeşil, 78 madde.
- **Yayın denemesi.** 17 ölçümün 17'si yeşil: bozuk sürümde site eski yayınıyla açık, geri dönüş siteyi ve arka plan sürecini önceki yayına döndürüyor, yayın kaydı sırasıyla. Denemeden sonra sağlık ucu yine 0.79.0.
- **Yeni ayarların kurulu veritabanına girmesi.** Sıfırlama gerekmedi (kart 0069'un kuralı). Panelin Sipariş ayarları ekranında müşteri iptali "Ödeme beklenirken", iade talebi 14 gün, iade kargosu mağaza, bildirim alıcıları boş, sekiz bildirim açık; kargoya verme penceresinde tek firma "Deneme Kargo".
- **Gezinti** (deneme adresinde, gerçek ekranlardan geçerek; betik kayda girmedi, geçici yönetici kendi açıp kapattı, kapandıktan sonra şifresi 401):

  | | Bilgisayar (1280 px) | Telefon (390 px) |
  |---|---|---|
  | Hesap | kayıt, çıkış, yeniden giriş (Siparişlerim açılır) | üye girişi, Hesabım, Siparişlerim, ayrıntı, Adreslerim |
  | Adres | Adreslerim'e ekleme (Ankara, Altındağ), varsayılan teslimat ve fatura | — |
  | Sipariş | Porselen Kupa ×2 + Spor Çorap Seti ×1, 719,60 + 49,90 kargo = 769,50 TL; ödemede kayıtlı adres seçili ve dolu; havaleyle ORN-1007 | üye olmadan havaleyle ORN-1008, 199,80 TL |
  | Siparişlerim | liste ve ayrıntı, ödeme beklenirken havale kutusu ve bildirim bağlantısı | aynı ayrıntı |
  | Panel | havale onayı, kargoya verme (Deneme Kargo, takip no), teslim | panel ekranlarında yana kayma yok |
  | İade talebi | müşteri 1 Porselen Kupa için talep açtı; panelde onay, talepten iade 189,90 TL (KDV 31,65), stoğa kondu; sipariş "Kısmi iade"; müşteri onayı ve iadeyi görüyor | — |
  | Takip | — | sipariş alındı sayfasındaki bağlantıyla numara dolu; e-postayla kısaltılmış sonuç (HTML'de soyad, telefon, açık adres, posta kodu, e-posta yok); "Başka bir sipariş sorgula" çerezi siler |

  - 43 sayfa ölçümünde yana kayma, konsol hatası, hidrasyon uyarısı ve 400+ yanıt yok; masaüstündeki sayfalar telefonda, telefondakiler masaüstünde de ölçüldü.
  - Teslim edilmiş siparişin ilerleme şeridinde dört adım tarihli, kargo satırı "Deneme Kargo · Takip no".
  - Betiğin ilk beklentisi iki yerde yanlıştı (ödeme bekleyen havalede şerit yerine havale kutusu, teslim edilmiş siparişte "bulunulan adım" yok); ikisi de tasarım gereği, kodla doğrulandı.

Notlar:
- Kargo firmasının takip adresi tanımlı değil, panelde ve müşteride takip bağlantısı görünmez.
- Gezintinin müşteri hesabı (`gezinti-musteri-f153218902@ornek.test`) açık kalır. ORN-1007 kısmen iade edilmiş hâlde durur (Spor Çorap Seti 1 ve Porselen Kupa 1 adet satılmış); ORN-1008 bildirimsizdir, 1 günde kendiliğinden iptal olur ve stoğu döner.

## Durum

yapılacak
