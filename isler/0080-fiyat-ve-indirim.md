# 0080 · Fiyat, indirim ve fiyat geçmişi

## Amaç

Her satılabilir birimin satış fiyatı ve tarihli indirimli fiyatı olur. Her fiyat değişikliği geçmişe yazılır (temel paket: Fiyat).

Önce 0076 bitmiş olmalı.

## Olmazsa olmazlar

- `fiyat` modülü. Fiyat satılabilir birime bağlıdır; varyantlar (0085, Katalog 2) aynı yolu kullanır.
- Satış fiyatı, indirimli fiyat, indirimin başlangıç ve bitiş zamanı. İndirimli fiyat satış fiyatından küçük olmalı.
- Bir anın geçerli fiyatını veren tek işlev. Zamanlar sitenin saat diliminde yorumlanır.
- Tutar kuruş olarak tam sayıyla tutulur, para birimi site ayarından gelir.
- Her değişiklik fiyat geçmişine aynı veritabanı işleminde, tarihiyle yazılır. Geçmiş güncellenemez ve silinemez.
- Fiyat değişiklikleri değişiklik kaydına da yazılır (kim değiştirdi).

## Sınırlar

- Son 30 günün en düşük fiyatı ve vitrinde gösterilecek fiyat 0081'dedir.
- Toplu fiyat değişikliği panel bölümüyle gelir.

## Bitti sayılır

- İndirim başlamadan, sürerken ve bittikten sonra geçerli fiyat testte doğru; gece yarısı sınırı sitenin saat dilimine göre.
- Her değişiklik geçmişte bir satır; geçmişi güncelleme ve silme reddediliyor (gerçek veritabanıyla).
- Satış fiyatından büyük indirimli fiyat reddediliyor.

## Durum

yapılacak
