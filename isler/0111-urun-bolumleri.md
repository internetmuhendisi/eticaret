# 0111 · Ürün bölümleri

## Amaç

Ana sayfanın ürün gösteren bölümleri kütüphaneye eklenir: ürün vitrini, sekmeli vitrin, geri sayımlı fırsatlar ve marka logoları.

Bölüm: Tasarım. Önce 0106 ve 0109 bitmiş olmalı.

## Olmazsa olmazlar

- Ürün kaynağı tek yerde tanımlanır ve her ürün bölümü onu kullanır: elle seçim, kategori, marka, etiket, yeni gelenler, indirimdekiler. Kaynak yalnız vitrinde görünen ürünleri getirir, tükenen ürün kuralına uyar ve tek sorguyla çalışır.
- Ürün vitrini: başlık, kaynak, adet, ızgara ya da kaydırmalı, ürün kartı tipi, isteğe bağlı yan afiş.
- Sekmeli vitrin: her sekme kendi başlığı ve kaynağıyla.
- Geri sayımlı fırsatlar: indirimi süren ürünler ve her kartta indirimin bitişine geri sayım, isteğe bağlı yan afiş. Bitiş tarihi çekirdeğin indiriminden gelir, elle girilmez. İndirimi biten ürün bölümden düşer.
- Kullanıcının kararıyla geri sayımlı fırsatlar bölümü temel pakettedir. Katalogdaki "Geri sayım" eklentisi ürün sayfası ve öteki yerler için kalır. `temel-paket.md` güncellenir, karar kaydı yazılır.
- Marka logoları: seçilen markalar logolarıyla, markanın sayfasına bağlı. Markaya logo alanı eklenir (veritabanı değişikliği, görsel dosya deposundan).
- Ürünü olmayan bölüm vitrinde çizilmez.
- Her bölüm katalogda örnek veriyle görünür.

## Sınırlar

- Marka sayfası ve kategori sayfası yazılmaz (Vitrin bölümü).

## Bitti sayılır

- Her kaynak gerçek veritabanıyla doğru ürünleri getiriyor: gizli, taslak, silinmiş ve zamanı gelmemiş ürün gelmiyor, sorgu sayısı ürün sayısıyla artmıyor.
- Geri sayım indirimin bitişiyle aynı, biten indirim bölümden düşüyor (sabit zamanla test).
- Marka logosu kaydediliyor ve bölümde görünüyor.
- Dört bölüm iki temada ve üç genişlikte kontrol edildi, elle içerik yok.

## Durum

bitti
