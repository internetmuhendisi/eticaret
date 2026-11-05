# 0020 · Deneme adresi ve şifreli bağlantı

## Amaç

Her site önce bir deneme adresinde açılır. Deneme adreslerinin biçimi belirlenir ve Caddy bu adreslere şifreli bağlantı sertifikasını kendisi alır (`planlar/komutlar.md`, karar 0013).

Önce 0019 bitmiş olmalı.

## Olmazsa olmazlar

- Kullanıcıdan: altyapı için kullanılacak bir alan adı. Alan adı yoksa satın alınması ürün kararıdır, kullanıcıya sorulur.
- Deneme adresinin biçimi seçilir (örneğin `ornek-magaza.deneme.<alan-adi>`) ve karar kaydına yazılır.
- Alan adı ayarı sunucuyu gösterir. Alan adında yapılacak her değişiklik önce kullanıcıya söylenir, onayı alınır.
- Caddy deneme adreslerine sertifikayı alır ve yeniler. Şifresiz bağlantı şifreliye yönlenir.
- Deneme adresleri arama motoruna kapalıdır.

## Sınırlar

- Mağazaların kendi alan adları teslimin işidir.

## Bitti sayılır

- Sunucudaki deneme kutusu deneme adresinde şifreli bağlantıyla açılıyor.
- `http://` ile açılan adres `https://` adresine yönleniyor.
- Deneme adresi arama motorlarına "dizine alma" diyor.
- Deneme adresi biçiminin karar kaydı yazıldı, `planlar/komutlar.md` dosyasındaki açık konu kapandı.

## Durum

bitti
