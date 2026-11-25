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

## Notlar

- Kullanıcı kararı (2026-11-25): kapatılmış hesabın e-postası yeniden davet edilebilir; yeni hesap açılır, eski kapalı kalır.
- Karar 0179. Davet edilen kişi adını ve şifresini koyar, aynı adımda kurulum ekranına geçer; mağaza sahibi rolü davetle verilmez (taslak).
- Taslak karşılaştırması: davet ve "Davet hazır" yan pencereye alındı, başarı kutusu eklendi, roller kalın. Taslaktaki kartlı giriş görünüşü bütün giriş sayfalarına birlikte gelmeli: kart 0306.
- Gönderimin bildirimi kopyalamanınkiyle üst üste binince arkadaki bildirim taramada kontrast hatası verdi (kart 0217'nin sorunu); gönderim artık bildirim vermez, sonucu pencere söyler.

## Durum

yapılacak
