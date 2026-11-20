# 0275 · Ekibe davet

## Amaç

Bugün yönetici hesabı yalnız sunucuda komutla açılıyor (kart 0048). Mağaza sahibi çalışanını panelden davet edebilmeli.

Bölüm: Yönetim paneli. Önce 0274 bitmiş olmalı.

## Olmazsa olmazlar

- Davet: e-posta ve rol; davet bağlantısı tek kullanımlık, süreli (taslaktaki karar), veritabanında özetiyle saklanır; geri alınabilir.
- Davetle gelen kişi şifresini koyar ve iki aşamalı girişi kurar (kart 0028); davet edilen rolle başlar.
- Davet e-postası kuyruğa girer; sunucuda gerçek gönderim yokken (kart 0060) bağlantı panelde kopyalanabilir.
- Sıkı istek sınırı, robot koruması gerekirse; kullanılmış, süresi dolmuş ve geri alınmış bağlantının aynı cevabı.

## Sınırlar

- Altyapı sahibinin yönetici açma komutu değişmez.

## Bitti sayılır

- Gerçek veritabanı ve posta kutusuyla davet, kabul, süre, geri alma, yeniden kullanım; tarayıcıda baştan sona (davet, kabul, ilk giriş); iki renkte ve üç genişlikte tarama.
- Ekran görüntüsü taslakla yan yana kondu, farklar düzeltildi.
- Bağımsız kontrol yapıldı.

## Durum

yapılacak
