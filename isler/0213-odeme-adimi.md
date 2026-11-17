# 0213 · Ödeme adımı

## Amaç

Müşteri sepetten ödemeye geçer: kim olduğunu, teslimat ve fatura bilgisini, notunu ve ödeme yöntemini verir, sözleşmeleri onaylar (temel paket: Sepet ve ödeme). Siparişin kaydı ve ödeme yöntemlerinin işleyişi kart 0214'tedir.

Bölüm: Sepet ve ödeme. Önce 0212, 0091 ve 0065 bitmiş olmalı.

## Olmazsa olmazlar

- Üye olmadan alışveriş: site ayarı (`planlar/site-ayarlari.md`, varsayılan açık). Kapalıysa ödeme adımı girişe yönlendirir. Ödeme sırasında isteğe bağlı hesap açma (müşteri kaydının kuralıyla, karar 0051).
- Teslimat bilgisi: ad, soyad, adres, il ve ilçe listeden (`cekirdek/bolgeler/`, ortak adres şeması, karar 0056, 0057), posta kodu, telefon. Telefonun zorunluluğu site ayarıdır (varsayılan açık). Giriş yapmış müşterinin önceki adresi önerilir; adres defteri on üçüncü bölümdedir.
- Fatura bilgisi: bireysel ya da kurumsal; "fatura adresi teslimat adresiyle aynı" varsayılan işaretli; kurumsalda firma adı, vergi dairesi ve vergi numarası. Biçim doğrulaması ülkeye bağlı yazılmaz.
- Sipariş notu: uzunluk sınırlı düz metin.
- Vergi adrese göre yeniden hesaplanır (teslimat, fatura ya da mağaza adresi; site ayarı, karar 0061). Özet oran oran vergi dökümüyle sepetle aynı işlevden gelir.
- Sözleşme onay kutuları: ön bilgilendirme formu ve mesafeli satış sözleşmesi. Metinler siparişin bilgileriyle dolar: satıcı (kart 0091), ürünler, toplam, teslim süresi (`kargoyaVermeSuresi`), iade koşulları. Bugün metinler yer tutucu şablondur, gerçek metin kart 0063'te gelir. Onay metin sürümüyle kaydedilir (`cekirdek/kayitlar/musteri-onaylari.ts`).
- Pazarlama izni kutusu işaretsiz gelir, işaretlenmezse izin verilmez (kayıt formundaki kural, kart 0033).
- Ödemeye geçen sepetin birimleri stok ayırma süresi kadar ayrılır (site ayarı, varsayılan 15 dakika); süre dolunca ya da ödeme başarısız olunca serbest kalır (iş kuralları).
- Kişisel veri taşıyan uçlar önbelleğe girmez (kart 0065). Uçlar robot korumalı ve istek sınırlıdır.
- Form ortak form parçasıyla (kural: formlar); alan hataları alana bağlı, klavyeyle baştan sona doldurulur.
- Testler gerçek veritabanıyla: üye ve üye olmayan yol, ayar kapalıyken yönlendirme, bireysel ve kurumsal fatura, ayrı fatura adresi, tutarsız il ve ilçenin reddi, zorunlu onaylar, işaretsiz pazarlama izni, aynı anda iki ödemede stok ayırma, süresi dolan ayırma, tarayıcıdan gelen tutarın yok sayılması. Tarayıcıda klavyeyle baştan sona, hatalı form, iki renkte ve üç genişlikte tarama. Her yeni denetim bilerek bozularak kırmızıya düşüyor.
- Taslakla karşılaştırma: ekran görüntüsü taslakla yan yana, iki temada, telefon ve bilgisayarda; farklar düzeltilir ya da nedeni kullanıcıya söylenir.

## Sınırlar

- Siparişin kaydı, ödeme yöntemlerinin işleyişi ve sipariş alındı sayfası kart 0214'tedir.
- Gerçek yasal metin bu kartta yazılmaz (kart 0063, hukukçu).
- Doğrulanmamış adrese pazarlama e-postası gitmemesi kart 0064'tedir; bugün pazarlama e-postası gönderen yer yoktur.
- Adres defteri, siparişlerim ve sipariş e-postaları on üçüncü bölümdedir.

## Bitti sayılır

- Üye olan ve olmayan müşteri ödeme adımını klavyeyle baştan sona geçebiliyor (tarayıcı testi).
- Onaylar sürümüyle, pazarlama izni yalnız işaretlenince kaydediliyor (test).
- Ödemeye geçen sepetin stoğu ayrılıyor, süre dolunca serbest kalıyor; aynı anda iki ödemede son ürün iki kez ayrılmıyor (test).
- Taslakla karşılaştırma yapıldı.

## Durum

bitti
