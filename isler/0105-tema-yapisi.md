# 0105 · Tema yapısı ve sitenin temaları

## Amaç

Bir sitenin görünüşü temadır: renkler ve yazı tipleri, parçaların görünüm seçenekleri ve hazır bir başlangıç düzeni. Her sitenin kullanabileceği temalar kurulumda belirlenir.

Bölüm: Tasarım. Önce 0102 ve 0103 bitmiş olmalı.

## Olmazsa olmazlar

- Tema tanımı: tasarım değerlerinin tamamı ve koyu tema değerleri, mağaza sahibinin değiştirebileceği değerler ve her birinin seçenekleri (renk, yazı tipi, köşe ve düğme biçimi), parçaların görünüm seçenekleri (örneğin ürün kartının birkaç tipi) ve başlangıç düzeni (üst kısım, ana sayfa, alt kısım bölümleri).
- Tema tanımı bir şemadan geçer. Eksik değer, tanımsız seçenek ya da kütüphanede olmayan bölüm içeren tema açılmaz.
- Hazır temalar çekirdekte durur. Bir müşteriye özel yapılan tema o sitenin klasöründe durur ve yalnız o sitede görünür.
- Sitenin kullanabileceği temalar altyapı sahibinin site ayarıdır ve kurulumda belirlenir. Panel yalnız bu listeyi gösterir.
- Mağaza sahibinin tema ayarları veritabanında durur (karar 0010). Yayınlanan her hâli sürüm olarak saklanır, önceki sürüme tek adımda dönülür.
- Mağaza sahibinin seçtiği renk kontrast ölçüsünden geçer. Geçmezse kaydedilmez ve okunur bir ton önerilir.
- Panel bütün sitelerde aynı görünür, siteden yalnız logo ve ana rengi alır.
- Kullanıcının kararıyla panelde canlı önizleme yok, her temanın gezilebilir bir demosu olur (0116). Bu, karar 0005'in önizleme ve özel tema maddelerinin yerine geçen yeni bir karar kaydıyla yazılır. `CLAUDE.md`, `temel-paket.md` ve tasarım sistemi kuralı aynı değişiklikte güncellenir.
- Site ayarları taslağına yeni ayarlar varsayılan değerleriyle yazılır.

## Sınırlar

- Tema değişince düzenin ne olacağı bu kartta değil (0113).
- Panel ekranı yazılmaz, işler servis ve uç düzeyindedir.
- Örnek Mağaza'nın teması bu kartta yazılmaz (0114); testler deneme temasıyla yapılır.

## Bitti sayılır

- Bozuk tema tanımı açılmıyor (bozuk örnekleriyle).
- Bir sitenin özel teması başka bir sitede görünmüyor ve seçilemiyor (gerçek veritabanıyla test).
- Kullanılabilir temalar listesinde olmayan tema seçilemiyor.
- Kontrastı yetersiz renk kaydedilmiyor, öneri dönüyor.
- Tema ayarının sürümüne geri dönülüyor.
- Yeni karar kaydı yazıldı, 0005'e "yerine geçti" notu eklendi.

## Durum

bitti
