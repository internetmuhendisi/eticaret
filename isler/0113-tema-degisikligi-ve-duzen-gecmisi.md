# 0113 · Tema değişikliği ve düzen geçmişi

## Amaç

Mağaza sahibi tema değiştirince düzeni kaybetmez. "Yeni temanın düzenini uygula" ya da "düzenimi koru" seçer; önceki düzen saklanır ve geri dönülebilir.

Bölüm: Tasarım. Önce 0105 ve 0106 bitmiş olmalı.

## Olmazsa olmazlar

- Tema değişikliği iki yolla yapılır: yeni temanın başlangıç düzenini uygulamak ya da mevcut düzeni korumak.
- Düzeni korurken yeni temada olmayan görünüm seçeneği temanın varsayılanına düşer, bölüm silinmez.
- Hiçbir durumda içerik silinmez: bölümlerin alan değerleri, görseller, ürünler, menüler yerinde kalır.
- Her tema değişikliğinden önce düzen ve tema ayarları bir sürüm olarak saklanır. Önceki sürüme tek adımda dönülür.
- Değişiklik ve geri dönüş değişiklik kaydına girer, tek işlemde yapılır.
- Tema değiştirme yetkisi izinlerden okunur. "Mağaza sahibi temayı değiştirebilir" ayarı kapalıysa reddedilir.

## Sınırlar

- Panel ekranı ve soru penceresi yazılmaz (Vitrin bölümü); işler servis ve uç düzeyindedir.

## Bitti sayılır

- İki yolun her biri gerçek veritabanıyla denendi: düzen ve içerik beklendiği gibi.
- Geri dönüş önceki düzeni ve tema ayarlarını aynen getiriyor.
- Yarıda kalan değişiklik hiçbir şey bırakmıyor.
- Ayar kapalıyken ve yetkisiz rolde değişiklik reddediliyor.

## Durum

yapılacak
