# 0028 · Yöneticinin iki aşamalı girişi

## Amaç

Yönetici şifresi ele geçse bile panele girilemesin. Yönetici girişinde şifreden sonra telefondaki doğrulama uygulamasının kodu istenir (`.claude/rules/guvenlik.md`, temel paket: Güvenlik).

Önce 0027 bitmiş olmalı.

## Olmazsa olmazlar

- Doğrulama uygulamasıyla (zamanlı tek kullanımlık kod) iki aşamalı giriş.
- Kurulum ekranı: karekod, ilk kodla onay, tek kullanımlık yedek kodlar.
- Yöneticiler için zorunlu. Kurmamış yönetici ilk girişte kurulum ekranına gider, panelin başka sayfasına geçemez.
- Kod denemelerinde de deneme sınırı.
- Kodun gizli anahtarı veritabanında şifreli durur.
- Yedek kodla girişte o kod bir daha geçmez.

## Sınırlar

- Müşteri hesabında iki aşamalı giriş temel pakette yoktur, yapılmaz.
- SMS ile kod gönderimi yapılmaz.
- Kaybedilen telefonda hesabı kurtarmanın altyapı sahibi tarafı ayrı karttır, gerekirse yazılır.

## Bitti sayılır

- Kurulumu yapmış yönetici yalnız şifreyle giremiyor, doğru kodla giriyor. Testler bunu gösteriyor.
- Kurulumu yapmamış yönetici panele değil kurulum ekranına düşüyor.
- Kullanılmış bir yedek kod ikinci kez reddediliyor.

## Durum

bitti
