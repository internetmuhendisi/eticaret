# 0055 · Yanlış kod ve yedek kodla girişte uyarı

## Amaç

Şifreyi ele geçiren biri yöneticiyi kilitlemeden 15 dakikada 4 kod deneyebilir; hesapla bir yılda doğru tahmin şansı yaklaşık %34'tür (karar 0044). Yanlış kod ve yedek kodla giriş yalnız günlüğe yazılır, kimse görmez. Şifre sızmış bir hesabın işareti kaybolur.

Önce e-posta gönderimi (kart 0032) bitmiş olmalı.

## Olmazsa olmazlar

- Şifresi doğru, kodu yanlış denemeler yöneticiye bildirilir: şifrenin ele geçtiğini gösterir.
- Yedek kodla girişte yöneticiye bildirim gider.
- Sayaç bellekte olduğu için yeniden başlamada sıfırlanması ayrıca ele alınır.

## Sınırlar

- Bildirimin kendisi şifreyi ya da kodu taşımaz.

## Bitti sayılır

- Şifre doğru, kod yanlış denemede yöneticiye e-posta gidiyor. Gerçek gönderimle ölçüldü.
- Yedek kodla girişte e-posta gidiyor. Ölçüldü.
- Bildirim tekrarlı denemede posta kutusunu doldurmuyor. Testler bunu gösteriyor.

## Durum

yapılacak
