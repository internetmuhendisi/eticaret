# 0014 · Ortak hata katmanı ve seviyeli günlük

## Amaç

Sunucuda ve ekranda oluşan bütün hatalar tek bir katmanda yakalanır, sunucu kayıtları seviyeli ve gizli bilgisiz tutulur (`.claude/rules/hata-izleme.md`, `.claude/rules/guvenlik.md`).

Önce 0013 bitmiş olmalı.

## Olmazsa olmazlar

- Sunucu tarafında ortak hata yakalayıcı. Beklenmeyen hata kullanıcıya iç ayrıntı göstermez, zarfla döner.
- Ekranda bölüm bölüm hata sınırı: bir bölümün hatası sayfanın gerisini düşürmez.
- Seviyeli günlük: bilgi, uyarı, hata, ölümcül. Her satırda site kod adı.
- Günlüğe şifre, anahtar ve kart bilgisi yazılmaz, e-posta ve telefon kısaltılır. Bunu deneyen testler.
- Hata izleme aracına bağlanacak tek bir yer bırakılır.

## Sınırlar

- Hata izleme aracının seçimi ve bağlanması ilk yayın işidir (0022).

## Bitti sayılır

- Bilerek hata veren bir uç zarfla ve iç ayrıntısız dönüyor, günlükte hata seviyesinde görünüyor.
- Bir bölümde bilerek çıkarılan hata sayfanın geri kalanını bozmuyor.
- Günlüğe şifre yazmaya çalışan test maskelenmiş çıktı görüyor.

## Durum

yapılacak
