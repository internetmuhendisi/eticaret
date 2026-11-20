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

## Durum

yapılacak
