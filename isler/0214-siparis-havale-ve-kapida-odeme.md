# 0214 · Sipariş, havale ve kapıda ödeme

## Amaç

Ödeme adımının sonunda sipariş oluşur ve müşteri havale ya da kapıda ödemeyle sipariş verebilir (temel paket: Sepet ve ödeme, Sipariş). Bu kartta sipariş, ödeme adımının sonunda oluşan kayıt kadardır; sipariş yönetimi, sipariş e-postaları ve müşteri hesabı on üçüncü bölümdedir.

Bölüm: Sepet ve ödeme. Önce 0213 bitmiş olmalı.

## Olmazsa olmazlar

- Sipariş modülü (`cekirdek/moduller/siparis/`): siparişte o anki ürün adı, seçim, birim fiyat, vergi oranı ve tutarı, kargo, toplam, teslimat ve fatura bilgisi, not, onaylar ve ödeme yöntemi saklanır. Ürün sonradan değişince sipariş değişmez.
- Sipariş numarası: önek ve başlangıç numarası altyapı sahibinin ayarıdır (`planlar/site-ayarlari.md`); aynı anda gelen siparişlerde tekrar etmez.
- Sipariş durumları kayıt dosyasındadır; bu kartta yalnız "ödeme bekleniyor" ve "iptal" yazılır, öteki durumlar on üçüncü bölümde. Her durum değişikliği kim, ne zaman, neden ile sipariş geçmişine yazılır.
- Stok sipariş kaydıyla aynı işlemde "yeterliyse düş" ile düşer (`stokDus`); ayrılan stok siparişe geçer. Aynı anda gelen iki sipariş son ürünü iki kez satmaz.
- Ödeme yöntemleri kaydı: havale, kapıda ödeme (nakit, kart). Her yöntemin açık ya da kapalı olması ve sırası mağaza sahibinin ayarıdır. Kapıda ödemenin seçenekleri site ayarıdır (varsayılan nakit; Örnek Mağaza'da nakit ve kart, karar 0008). Yöntem kaydı kartla ödeme eklentisinin de bağlanacağı biçimde kurulur (kart 0215).
- Havale: banka hesapları listesi (banka, hesap sahibi, IBAN; IBAN biçimi doğrulanır), sipariş alındı sayfasında hesaplar ve açıklamaya yazılacak sipariş numarası. Havale bildirim formu: müşteri sipariş numarası ve e-postasıyla (üye değilse) ödediğini bildirir; bildirim siparişe kaydedilir. Bildirimin panelde görünmesi ve yönetici e-postası on üçüncü bölümdedir.
- Ödenmeyen havale siparişi süre sonunda kendiliğinden iptal olur, stok geri döner (`stokArtir`). Süre site ayarıdır (varsayılan 3 gün). Zamanlı iş kuyruktan çalışır, aynı sipariş iki kez iptal edilmez.
- Kapıda ödeme: sipariş "ödeme bekleniyor" durumunda oluşur, seçilen seçenek (nakit ya da kart) siparişte saklanır.
- Sipariş alındı sayfası: numara, özet, ödeme yöntemine göre bilgi. Yalnız siparişi veren görür.
- Panel: ödeme yöntemleri (açma, kapama, sıra) ve banka hesapları ekranları. Değişiklik kaydına girer.
- Testler gerçek veritabanıyla: sipariş anındaki değerlerin saklanması ve sonra değişmemesi, aynı anda iki siparişte son ürün, numara tekilliği, kapalı yöntemle sipariş verilememesi, sıra, havalenin süre sonunda bir kez iptali ve stoğun dönmesi, süresinden bir an önce iptal olmaması, havale bildirimi (başkasının siparişine bildirim yazılamaması), iki site. Tarayıcıda havale ve kapıda ödemeyle baştan sona sipariş, sipariş alındı sayfası, iki renkte ve üç genişlikte tarama. Her yeni denetim bilerek bozularak kırmızıya düşüyor.
- Taslakla karşılaştırma: ekran görüntüsü taslakla yan yana, iki temada, telefon ve bilgisayarda; farklar düzeltilir ya da nedeni kullanıcıya söylenir.
- Kart 0213'ten (karar 0140, kullanıcı kararı): ödeme sayfasının ödeme yöntemi bölümü bu kartta eklenir (taslaktaki 4. bölüm). Sipariş ödeme oturumundan (`odeme_oturumlari`) kurulur: stok düşerken başka oturumların süresi dolmamış ayırmaları hesaba katılır, oturumun ayırması silinir, oturum siparişe dönmüş olarak işaretlenir (temizlik onu silmez). Onaylar oturumdan siparişe sürümleriyle geçer. Giriş yapmış müşterinin önceki siparişteki adresi teslimat adresi olarak önerilir. Onaydan sonra bugün gösterilen "ürünleriniz ayrıldı" iletisi sipariş alındı sayfasına yönlendirmeyle değişir.

## Sınırlar

- Sipariş listesi, sipariş ayrıntısı, havale onayı, kargo, iptal ve iade ekranları, sipariş e-postaları, siparişlerim ve sipariş takibi on üçüncü bölümdedir.
- "Yalnız satın alanlar yorum yapabilir" denetimi (kart 0139) bu kartta bağlanmaz; hangi sipariş durumunun "satın aldı" sayılacağı on üçüncü bölümde kararlaştırılır.
- Kartla ödeme kart 0215'tedir.

## Bitti sayılır

- Müşteri havale ve kapıda ödemeyle sipariş verebiliyor, sipariş anındaki değerler saklanıyor (test).
- Ödenmeyen havale siparişi süre sonunda bir kez iptal oluyor, stok geri dönüyor (test).
- Ödeme yöntemleri panelden açılıp kapanıyor ve sıralanıyor, banka hesapları ekleniyor (test).
- Taslakla karşılaştırma yapıldı.

## Durum

bitti
