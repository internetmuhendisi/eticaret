# 0237 · Müşteri hesabı: giriş, kayıt, hesabım ve adreslerim

## Amaç

Müşterinin giriş ve kayıt sayfaları (kart 0033) taslaksız yazıldı; hesabım sayfası, adres defteri ve hesabın içinde favoriler yok (temel paket: Müşteri hesabı). Müşteri hesabına girip adreslerini yönetebilmeli, ödeme adımında kayıtlı adresini seçebilmeli.

Bölüm: Sipariş ve müşteri hesabı. Önce 0233 bitmiş olmalı.

## Olmazsa olmazlar

- Giriş, kayıt, şifremi unuttum ve şifre yenileme sayfaları 0233 taslağına göre yeniden çizilir; davranışları ve testleri (kartlar 0033, 0034) değişmez.
- Hesabım çerçevesi: menü (siparişlerim, adreslerim, favorilerim, hesap bilgileri, çıkış); girişsiz müşteri girişe yönlenir ve girişten sonra geldiği sayfaya döner (vitrin dönüşü kuralı, kart 0139). Sayfalar `noindex`.
- Adreslerim: ekleme, düzenleme, silme, varsayılan teslimat ve fatura adresi; ortak adres şemasıyla (il ve ilçe listeden). Sınırı ve kuralı kayıtta. Müşteri yalnız kendi adreslerini görür ve değiştirir.
- Ödeme adımı: giriş yapmış müşteri kayıtlı adresini seçer (bugünkü "önceki siparişin adresi" önerisinin yerine ya da yanında, 0233 kararıyla); ödemede girilen yeni adres isterse deftere kaydedilir.
- Favorilerim hesabın içinde görünür; bugünkü favoriler sayfası (kart 0140) ile aynı veri ve aynı davranış.
- Müşteri uçları: adresler; her müşteri ucunda başkasının kaydını dönmeme senaryosu (`rol-uc-erisimi.test.ts`). Kişisel veri taşıyan yanıt önbelleğe girmez.
- Kart 0187 bu kartta yapılır: girişsiz ziyaretçide hesap durumu sorusu konsola 401 düşürmez (kartın bitti sayılır listesi bu kartın listesine eklenir).
- Testler gerçek veritabanıyla: adres ekleme, düzenleme, silme, varsayılan, sınır, il-ilçe tutarsızlığı, başka müşterinin adresi, iki site. Tarayıcıda klavyeyle giriş, hesabım, adres ekleme ve ödeme adımında seçme; boş ve dolu hâller; iki renkte ve üç genişlikte tarama, yana kayma, konsol. Her yeni denetim bilerek bozularak kırmızıya düşüyor.
- Taslakla karşılaştırma: ekran görüntüsü taslakla yan yana, iki temada, telefon ve bilgisayarda; farklar düzeltilir ya da nedeni kullanıcıya söylenir.

## Sınırlar

- Siparişlerim ve sipariş takibi kart 0238'dedir.
- Hesap silme, e-posta değiştirme ve kayıtta e-posta doğrulaması (kart 0062) bu kartta yazılmaz.
- Müşteri girişinin kilitlenmesi (kart 0066) gerçek e-postaya bağlıdır (kart 0060), bu karta karıştırılmaz.

## Bitti sayılır

- Müşteri hesabına girip adres ekliyor, düzenliyor, siliyor ve ödeme adımında seçiyor (tarayıcı testi).
- Başka müşterinin adresine erişilemiyor (test).
- Kart 0187'nin bitti sayılır maddesi karşılandı.
- Taslakla karşılaştırma yapıldı.

## Durum

bitti
