# 0035 · Site çalışma anında okunur

## Amaç

Next.js vitrin ve panel sayfalarını şimdilik derleme anında hazırlıyor, sitenin adı ve ayarları derlenen pakete giriyor. Docker görüntüsü siteden bağımsız olmalı, site klasörü kutuya çalışırken bağlanır (kararlar 0013, 0021). Bu yüzden site klasörü derlemede değil, uygulama açılırken okunmalı.

Kart 0010'da fark edildi. 0015'ten önce bitmiş olmalı.

## Olmazsa olmazlar

- Uygulama `SITE_KLASORU` olmadan da derlenebilir.
- Site klasörü uygulama açılırken bir kez okunur ve doğrulanır. Geçersizse uygulama açılmaz.
- Sitenin ayarlarına bağlı sayfalar (vitrin ve panel) çalışma anında hazırlanır. Önbellek kuralı `.claude/rules/performans.md`'ye uyar.

## Sınırlar

- Docker görüntüsü bu işe girmez (0015).

## Bitti sayılır

- Uygulama değişkensiz derleniyor.
- Aynı derleme iki farklı site klasörüyle açılınca her biri kendi adını gösteriyor.
- Değişken yokken ya da klasör geçersizken uygulama açılmıyor ve hatayı söylüyor.

## Durum

bitti
