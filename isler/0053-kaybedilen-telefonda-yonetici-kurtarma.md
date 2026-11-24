# 0053 · Telefonunu kaybeden yöneticinin hesabını kurtarma

## Amaç

Kart 0028 ile yöneticiler için iki aşamalı giriş zorunlu olur. Telefonunu ve yedek kodlarını birlikte kaybeden yönetici panele giremez, bu kartın öncesinde kurtarma yolu yoktur. Yeni bir site mağaza sahibine teslim edilmeden önce yapılmalıdır.

Önce 0028 bitmiş olmalı.

Bölüm: Yönetim paneli.

## Olmazsa olmazlar

- Altyapı sahibi bir yöneticinin iki aşamalı girişini kaldırabilir. Yönetici sonraki girişte kurulum ekranına düşer, eski yedek kodlar ve açık oturumlar geçersiz olur.
- Kimlik doğrulaması altyapı sahibinin elle yaptığı bir adımdır; nasıl yapılacağı yazılı olur (telefonla arama gibi, kullanıcı kararı).
- Kaldırma hesabın bütün ara adımlarını da siler: açık kalan bir adımla kurulum yeniden onaylanamaz (karar 0044).
- Yapılan işlem kaydedilir: kim, ne zaman, hangi yönetici (kart 0029 ile).
- Yedek kodları kaybeden ama telefonu duran yönetici panelden yeni yedek kod üretebilir.
- İşlem yalnız o sitenin veritabanına dokunur.

## Sınırlar

- E-posta ya da SMS ile kendi kendine kurtarma yapılmaz: şifresi ele geçmiş hesapta ikinci aşamayı atlatan bir yol açardı.

## Not

Kart 0274 ile birlikte yapıldı (karar 0178): sıfırlamada şifre de sıfırlanır (kullanıcı kararı), yönetici yeni şifreyi e-posta bağlantısıyla koyar; panelde mağaza sahibi sıfırlar, son mağaza sahibininkini altyapı sahibi `pnpm sunucu-yonetici-iki-asama-sifirla` ile; kimlik kayıtlı numarayı geri arayarak doğrulanır (kullanıcı kararı). Yedek kodlar "Hesabım"da yenilenir.

## Bitti sayılır

- Kaldırma sonrası eski kod ve yedek kodlar geçmiyor, yönetici yalnız yeniden kurulumla girebiliyor. Testler bunu gösteriyor.
- Başka sitenin yöneticisine işlem yapılamıyor. Ölçüldü.
- Yeni yedek kod üretilince eskileri geçmiyor. Testler bunu gösteriyor.

## Durum

bitti
