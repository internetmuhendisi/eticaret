# 0304 · Ana sayfanın blog bölümü kategoriye kimlikle bağlansın

## Amaç

Ana sayfanın "Blog yazıları" bölümü blog kategorisini adres adıyla saklıyor (kart 0112'nin tarifi, `blog-kategorisi` alan türü). Kart 0272'nin bağımsız kontrolü buldu: kategorinin adresi değişince ya da kategori silinince bölüm sessizce boşalıyor. Panel "şu an vitrinde görünmüyor" der, ama mağaza sahibi bölümü açıp kategoriyi yeniden seçmeli.

## Olmazsa olmazlar

- Bölüm kategoriye kimlikle bağlanır. Düzen servisi bağı, ürün kategorisinde olduğu gibi denetler (silinmiş kategoriye bağlanılmaz).
- Kayıtlı düzenlerdeki adres adları bir veri değişikliğiyle kimliğe çevrilir. Eski kod `eskiKodlar` kaydına yazılır (karar 0113).
- Başlangıç düzeni adres adıyla yazılmaya devam eder, kurulumda kimliğe çevrilir (`baslangicDuzeniniBagla`).

## Sınırlar

- Blog yazısını menüye bağlamak kart 0273'tedir.

## Bitti sayılır

- Gerçek veritabanıyla: kategorinin adresi değişince bölüm aynı kategorinin yazılarını gösterir; kategori silinince bölüm panelde nedeniyle işaretlenir.
- Eski kayıtlı düzen okunur, kategorisi korunur.

## Durum

yapılacak
