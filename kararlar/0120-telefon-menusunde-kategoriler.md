# 0120 · Telefonun yan menüsünde kategori menüsü tek bir "Kategoriler" dalıdır

## Tarih

2026-11-14

## Karar

**Kullanıcı kararı:** Telefon ve tabletteki yan pencere, masaüstündeki menü satırı gibi düzenlenir. Logo satırının seçtiği menülerden kategori ağacından gelenler önce, tek bir "Kategoriler" satırı olarak çizilir. Dokununca açılır (akordeon), içinde kategoriler alt kategorileriyle durur. Öteki menülerin bağlantıları onun altındadır.

- Bağlam, bölümlerin seçtiği menülerden kategori ağacından gelenlerin kodlarını taşır (`kategoriMenuleri`, menü servisinin `kategoriMenuleriniSec`'i, tek sorgu).
- Yan penceredeki grup ortak parçadır (`YanMenuGrubu`, `cekirdek/vitrin/bolumler/ortak/menu.tsx`). Adı menü satırının "Kategoriler" metnidir.

Karar 0083'ün yan pencerede seçilen menülerin alt alta çizildiği maddesinin yerine geçer.

## Neden

Müşteri gezisinde (2026-11-13) ölçüldü. Örnek Mağaza'nın logo satırı ana menüyü ve kategori menüsünü seçmiş, ana menü de kategorilere bağlantı veriyor. Yan pencere iki listeyi başlıksız alt alta çiziyordu. Giyim, Ev ve Yaşam gibi beş satır en üst düzeyde iki kez görünüyordu, birinde alt kategori oku vardı, ötekinde yoktu. Masaüstünde aynı iki menü "Kategoriler" düğmesi ve yanında ana menü olarak ayrışıyor, telefonda da aynı düzen tanıdık olur.

## Düşünülen diğer yollar

- **Her menü kendi başlığıyla, iki liste açık:** Kullanıcı seçmedi. Kategoriler yine iki kez görünürdü, yalnız başlıklarla ayrılırdı.
- **Örnek Mağaza'nın logo satırından kategori menüsünü çıkarmak:** Bu seçilmedi. Aynı durum her sitede çıkabilir, çekirdeğin düzeni çözmesi gerekir.

## Sonuçları

- Kategori menüsünü seçen her sitenin yan penceresi değişir: kategoriler bir dokunuş içeride kalır.
- Logo satırı yalnız kategori menüsünü seçmişse pencerede tek bir kapalı "Kategoriler" satırı görünür.
- Bağlama bir alan eklendi. Bağlamı elle kuran testler ve katalogun örnek bağlamı onu doldurur.
