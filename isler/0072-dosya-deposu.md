# 0072 · Dosya deposu ve güvenli yükleme

## Amaç

Logo, ürün görselleri ve videolar için her sitenin kendi dosya deposu olur. Yüklenen dosya denetlenmeden saklanmaz (temel paket: Ürün, Güvenlik).

## Olmazsa olmazlar

- Her sitenin dosyaları ayrı durur, bir site başka sitenin dosyasını okuyamaz ve yazamaz.
- Dosyalar Almanya'da durur (karar 0009). Dış bir hizmet açmak ya da ücretli bir hizmet almak gerekirse önce kullanıcıya sorulur. Seçim karar kaydına yazılır.
- Yüklemede dosyanın türüne içeriğinden bakılır, adına güvenilmez. İzin verilen türler ve boyut sınırı tek yerde tanımlanır.
- Dosya adları tahmin edilemez, kullanıcının verdiği ad yol olarak kullanılmaz.
- Görsellerin içindeki konum gibi gizli bilgiler silinir.
- Dosyalar sitenin yedeğine girer ve site tek başına geri yüklenebilir.
- Yerel ortamda ve kontrol hattında aynı depo düzeni çalışır.

## Sınırlar

- Görsel küçültme ve galeri 0087'dedir (Katalog 2).
- Yükleme ekranı yazılmaz.

## Bitti sayılır

- Uzantısı değiştirilmiş zararlı dosya, sınırı aşan dosya ve izinsiz tür testte reddediliyor.
- İki site birbirinin dosyasına ulaşamıyor (gerçek depoyla test).
- Konum bilgisi olan görsel bilgisi silinmiş olarak saklanıyor.
- Yedekten geri yüklenen sitenin dosyaları yerinde.
- Güvenlik kontrolleri tablosunun "dosya yükleme" durumu güncellendi.

## Durum

yapılacak
