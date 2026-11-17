# 0216 · Örnek Mağaza havaleyle sipariş alıyor

## Amaç

Bölümün sonunda Örnek Mağaza yeni çekirdek sürümüne geçer ve deneme adresinde havaleyle sipariş alabilir. "Canlı" bugünkü deneme adresidir (karar 0101); gerçek alan adına geçilmez.

Bölüm: Sepet ve ödeme. Bölümün son işi. Önce bu bölümün öteki kartları (0211–0215, 0155, 0193, 0091, 0065) ve 0207 bitmiş olmalı (kullanıcı kararı: 0207 yayından önce yapılır).

## Olmazsa olmazlar

- Yayından önce kullanıcıya sorulur:
  - Örnek Mağaza'nın kargo ücreti ve ücretsiz kargo sınırı (`planlar/site-ayarlari.md`: "sonra panelden girilir");
  - banka hesabı: demo olduğu açıkça belli olan bir değer, gerçek IBAN kullanılmaz;
  - kapıda ödeme ve kartla ödeme eklentisinin demoda açık olup olmayacağı (kart eklentisi yalnız test ortamıyla);
  - demoda verilen siparişlerin stoğu düşürmesi: ziyaretçiler stoğu tüketebilir; ödenmeyen havalenin iptal süresi, sıfırlama (karar 0100) ya da başka bir yol.
- Örnek Mağaza demo sitedir: gerçek ödeme almaz, arama motorlarına kapalı kalır (karar 0007).
- Kimlik yeni çekirdek sürümüne çıkar, sürüm notu yazılır, sitenin testleri çalışır. Notun "Güvenlik" bölümünde Next.js'in 16.4.6'ya yükseltilmesi (GHSA-mfr8-8qww-v76h, karar 0137, kart 0219) yazar.
- Veritabanı değişiklikleri yayın komutuyla uygulanır. Yeni başlangıç verisi (ödeme yöntemleri, banka hesabı, kargo) kurulu veritabanına girmiyorsa ne yapılacağı kullanıcıya sorulur.
- Yayından sonra sağlık kontrolü, sunucu denetimi ve deneme adresinde tarayıcıyla gezinti: sepet, ödeme adımı, havaleyle sipariş, sipariş alındı sayfası ve havale bildirimi telefon ve bilgisayarda.
- Sunucuda gerçek e-posta gönderimi yok (kart 0060); sipariş e-postaları on üçüncü bölümdedir.

## Sınırlar

- Gerçek alan adına geçilmez, gerçek mağazalara dokunulmaz.
- Sipariş yönetimi ekranları on üçüncü bölümdedir; demoda verilen siparişler panelde henüz listelenmez.

## Bitti sayılır

- Deneme adresinde müşteri havaleyle sipariş verebiliyor, sipariş alındı sayfasında banka hesabı ve sipariş numarası görünüyor.
- Sağlık ve sunucu denetimi yeşil.
- Geri dönüş komutunun bu sürümde çalıştığı biliniyor (yayın denemesi).

## Durum

yapılacak
