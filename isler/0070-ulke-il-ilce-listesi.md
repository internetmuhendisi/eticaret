# 0070 · Ülke, il ve ilçe listesi

## Amaç

Mağaza adresi, vergi bölgesi ve ileride teslimat adresi aynı bölge listesini kullanmalı. Liste tek yerde durur, her yer oradan okur (temel paket: Mağaza ayarları, Vergi).

## Olmazsa olmazlar

- Ülke listesi ve Türkiye'nin il ve ilçe listesi kodda değil, veri dosyasında durur. Liste kodla ülkeye bağlanmaz, başka ülkenin bölgeleri sonradan eklenebilir.
- Her ülkenin, ilin ve ilçenin değişmez bir kodu olur. Kayıtlar adı değil kodu tutar.
- Listenin kaynağı ve tarihi belgeye yazılır. Kaynak resmî değilse kullanıcıya söylenir.
- Bir ilçenin o ile ait olduğunu denetleyen tek doğrulama işlevi.

## Sınırlar

- Adres formu ve seçim kutuları yazılmaz.
- Posta kodu listesi tutulmaz, posta kodu yalnız biçimle denetlenir.

## Bitti sayılır

- 81 il ve bütün ilçeler listede, sayılar kaynakla karşılaştırılmış.
- Yanlış ile bağlanan ilçe ve olmayan kod testte reddediliyor.
- Çekirdekte ülke adı ya da il adı kodun içinde geçmiyor.

## Durum

çalışılıyor
