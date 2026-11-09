# 0106 · Bölüm kütüphanesi ve düzen

## Amaç

Üst kısım, ana sayfa ve alt kısım, panelden eklenip sıralanan ve gizlenen bölümlerden kurulur. Bölümler çekirdekte ortak bir kütüphanede durur, her bölüm kendi alanlarını tarif eder, düzenleme formu bu tariften kendiliğinden çıkar.

Bölüm: Tasarım. Önce 0105 bitmiş olmalı.

## Olmazsa olmazlar

- Bölüm türü tarifi: adı, hangi alana konabileceği (üst kısım, ana sayfa, alt kısım), alanları ve her alanın türü (metin, uzun metin, görsel, bağlantı, ürün kaynağı, kategori seçimi, marka seçimi, tarih, temanın renklerinden seçim, liste), görünüm seçenekleri ve hangi özelliğe bağlı olduğu.
- Alanlar bir şemadan doğrulanır. Düzenleme formu aynı tariften üretilir, ikinci bir form tanımı yazılmaz. Formun üretildiği katalogda gösterilir.
- Aynı türden birden çok bölüm aynı düzende olabilir (örneğin iki afiş).
- Düzen: her alandaki bölümlerin sırası, görünürlüğü ve alan değerleri. Veritabanında durur, başlangıç değeri temadan ya da site klasöründen gelir.
- Bağlı olduğu özellik olmayan bölüm (yorum, blog, bülten) eklenebilir ama vitrinde çizilmez ve panelde nedeni yazılır. Özellik gelince kendiliğinden açılır.
- Bölüm kodunda elle yazılmış içerik olamaz: ürün adı, fiyat, görsel adresi, mağazaya özel metin. İçerik yalnız alan değerinden ya da veriden gelir. Bunu bir kontrol korur, bozuk örnekleriyle.
- Bozulan bir bölüm sayfanın geri kalanını düşürmez.
- Düzen değişikliği değişiklik kaydına girer.
- Karar kaydı yazılır. Klasör düzeni ve kontrol tablosu aynı değişiklikte güncellenir.

## Sınırlar

- Bölüm türlerinin kendisi bu kartta yazılmaz (0108, 0110–0112). Kart kütüphaneyi bir deneme bölümüyle kanıtlar.
- Panel ekranı yazılmaz.

## Bitti sayılır

- Deneme bölümünün düzenleme formu tarifinden çıkıyor, alan değiştirince form değişiyor.
- Şemaya uymayan alan değeri kaydedilmiyor (gerçek veritabanıyla test).
- Aynı türden iki bölüm sıralanıp biri gizlenebiliyor.
- Özelliği olmayan bölüm çizilmiyor, özellik açılınca çiziliyor.
- Bölüm koduna fiyat, ürün adı ya da görsel adresi yazan örnek kontrolde kırmızı.

## Durum

bitti
