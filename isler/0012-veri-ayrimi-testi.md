# 0012 · Veri ayrımı testi

## Amaç

Bir sitenin başka bir sitenin verisini hiçbir yoldan göremediği gerçek veritabanıyla gösterilir (değişmez kural 2, karar 0003). Bu test bundan sonra her yayında çalışır.

Önce 0011 bitmiş olmalı.

## Olmazsa olmazlar

- Test iki deneme sitesi için iki ayrı veritabanı ve iki ayrı kullanıcı açar.
- A sitesinin kullanıcısı B'nin veritabanına bağlanamaz, B'nin tablosunu okuyamaz ve yazamaz.
- Uygulama A sitesi için çalışırken B'nin bağlantı bilgisini hiçbir yerden okuyamaz.
- Test kendi verisini hazırlar ve sonunda temizler, gerçek veritabanıyla çalışır.

## Sınırlar

- Uç ve rol bazındaki ayrım testleri uçlar yazılınca eklenir (0030).

## Bitti sayılır

- Veri ayrımı testi geçiyor.
- B'nin veritabanına A'nın kullanıcısına bilerek izin verilince test kırmızıya düşüyor.
- Test, test komutuyla birlikte çalışıyor.

## Durum

yapılacak
