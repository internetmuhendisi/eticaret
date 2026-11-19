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

## Durum

yapılacak
