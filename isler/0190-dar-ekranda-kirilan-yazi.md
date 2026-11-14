# 0190 · Dar ekranda fiyatın simgesi tutardan ayrılmasın

## Amaç

360 px'te iki sütunlu ürün kartında fiyat aralığı ("299,90 – 329,90 ₺") kırılıyor, "₺" tek başına alt satıra düşüyor. Kategori, ana sayfa, favoriler ve ilgili ürün kartlarında görüldü (14 Kasım telefon gezisi, 390 px'te sığıyor). Alt kısımdaki e-posta adresi de tireden bölünüyor ("iletisim@ornek-" / "magaza.test").

Bölüm: Vitrin. Kart 0146'dan önce kapanır.

## Olmazsa olmazlar

- Tutar ile para simgesi aynı satırda kalsın; satır kırılacaksa simge son tutarla birlikte insin. Düzeltme fiyat bileşeninde ya da biçimleyicide tek yerde yapılsın, her kart onu kullansın.
- Tek fiyatta, indirimli fiyatta, eski fiyatta ve aralıkta aynı kural geçerli olsun.
- Alt kısımdaki e-posta adresi tireden bölünmesin; sığmazsa yalnız @ ya da noktadan sonra kırılsın.

## Sınırlar

- Fiyatın yazılışı (aralık, ayırıcılar, simgenin yeri) değişmez.
- Kartın düzeni ve yazı boyu değişmez.

## Bitti sayılır

- 320 ve 360 px'te hiçbir kartta para simgesi kendi satırında durmuyor; tarayıcı testiyle ölçülüyor, eski hâlinde kırmızı.
- Alt kısımdaki e-posta 320 px'te tireden bölünmüyor.

## Durum

bitti
