# 0319 · Örnek Mağaza panelin ikinci kısmıyla yayında

## Amaç

Bölümün sonunda Örnek Mağaza yeni çekirdek sürümüne geçer: mağaza sahibi kupon açar, ürünlerini toplu ve Excel ile düzenler ve kopyalar, panelde arar, vergi ayarlarını görür, raporlarını görür, e-posta metinlerini düzenler ve panelde bildirim alır. "Canlı" bugünkü deneme adresidir (karar 0101); gerçek alan adına geçilmez.

Bölüm: Yönetim paneli 2. Bölümün son işi. Önce bu bölümün öteki kartları bitmiş olmalı.

## Olmazsa olmazlar

- Yayından önce kullanıcıya sorulur: Örnek Mağaza'da Excel eklentisinin açılıp açılmayacağı, örnek kuponların başlangıç verisine girip girmeyeceği, bu bölümde önerilen site ayarlarının Örnek Mağaza değerleri.
- Örnek Mağaza demo sitedir: gerçek ödeme almaz, arama motorlarına kapalı kalır (karar 0007).
- Kimlik yeni çekirdek sürümüne çıkar, sürüm notu yazılır, sitenin testleri çalışır; yeşil hattan geçmiş kayıtla yayınlanır.
- Veritabanı değişiklikleri yayın komutuyla uygulanır; yeni ayarların kurulu veritabanına girişi ölçülür (kart 0069'un kuralı). Başlangıç verisi yalnız ilk kurulumda yazıldığı için canlı demoya girmesi gerekenler ayrıca ele alınır (kart 0276'nın "Kurumsal" sütunu dersi).
- Yayından sonra sağlık kontrolü, sunucu denetimi ve deneme adresinde tarayıcıyla gezinti, telefon ve bilgisayarda: kupon açma, sepette kullanma, siparişte, e-postada ve fişte aynı indirim, kuponlu siparişin kısmi iadesi; toplu fiyat değişikliği ve vitrinde görülmesi; Excel ile dışa ve içe aktarma (eklenti açıksa); siparişleri dışa aktarma; dört rapor; e-posta metninin değiştirilip varsayılana dönmesi; panelde yeni sipariş, havale bildirimi, iade talebi ve düşük stok bildirimi; pano; ürün kopyalama; panelde sipariş, ürün, stok kodu ve müşteri araması; vergi ayarının değişip vitrinde görülmesi ve eski hâline dönmesi.
- Sunucunun belleği ve işlemcisi başka projelerle paylaşılıyor: aynı anda yalnız bir ağır test ya da tarayıcı çalışır, sistem yükünü bekleyen döngü kurulmaz.

## Sınırlar

- Gerçek alan adına geçilmez, gerçek mağazalara dokunulmaz.

## Bitti sayılır

- Deneme adresinde gezintinin her adımı çalışıyor (karta yazılı).
- Sağlık ve sunucu denetimi yeşil.
- Geri dönüş komutunun bu sürümde çalıştığı biliniyor (yayın denemesi).

## Sonuç

- Kullanıcı kararları (2026-11-28): Excel ile toplu ürün işlemleri eklentisi Örnek Mağaza'da açık; dört örnek kupon (HOSGELDIN10, GIYIM50, KARGOBEDAVA, YILBASI20) başlangıç verisinde kalır, canlı demoda hiç kupon olmadığı için yeni sürümün ilk açılışında bir kez yazılır; bu bölümün site ayarları önerilen değerlerde (rapor son 30 gün, ücretsiz kargo sınırı indirimden sonra; kupon kodu harf ayrımsız, Excel 5.000 satır, okunan bildirim 30 gün), `ayarlar.json`'a ayrıca bir şey yazılmaz.
- Yayından önce kontrol hattı bu bölümde her çalışmada kırmızıydı (yönetici şifre sıfırlama testi eski şablonu arıyordu): kart 0339 ile düzeldi.
- Çekirdek ve Örnek Mağaza 0.81.0, sürüm notu `cekirdek/surum-notlari/0.81.0.md`.

## Durum

yapılacak
