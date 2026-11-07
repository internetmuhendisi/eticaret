# 0034 · Şifremi unuttum

## Amaç

Şifresini unutan müşteri ve yönetici e-postasına gelen bağlantıyla yeni şifre belirler (temel paket: Müşteri hesabı ve E-postalar).

Önce 0027 ve 0033 bitmiş olmalı.

## Olmazsa olmazlar

- Vitrinde ve panelde "Şifremi unuttum" sayfası.
- E-postanın kayıtlı olup olmadığı belli edilmez, cevap her zaman aynıdır.
- Bağlantı tek kullanımlıktır ve kısa sürede geçersiz olur.
- Sıkı istek sınırı ve robot koruması.
- Şifre değişince açık oturumların hepsi kapanır, "şifren değişti" e-postası gider.
- Yöneticinin iki aşamalı girişi şifre sıfırlamayla atlanamaz.

## Sınırlar

- Panelde başka bir kullanıcının şifresini sıfırlama ekranı yapılmaz.

## Bitti sayılır

- Tarayıcı testi müşteri için baştan sona deniyor: istek, e-postadaki bağlantı (yerel posta kutusunda; kullanıcı onayıyla, gerçek adrese ulaşma kart 0060'ta), yeni şifre, yeni şifreyle giriş.
- Kullanılmış ya da süresi dolmuş bağlantı reddediliyor.
- Şifre sıfırlandıktan sonra eski oturum geçmiyor.
- Sıfırlamadan sonra yönetici yine doğrulama kodu istiyor.

## Durum

bitti
