# 0189 · Ana sayfada iki bölge aynı adı taşımasın

## Amaç

Kart 0170'in ölçümünde görüldü: kayan afişin bölgesi ekran okuyucuda "Öne çıkanlar" adını taşıyor (`aria-label`), Örnek Mağaza'nın "Öne çıkanlar" başlıklı ürün vitrini de aynı adla. Ekran okuyucu kullanıcısı bölgeler arasında gezerken iki aynı ad duyar, hangisinin afiş olduğunu ayırt edemez.

## Olmazsa olmazlar

- Kayan afişin bölge adı afiş olduğunu söyler (örneğin "Kampanyalar"); metin anahtarı terim sözlüğüyle uyumlu.
- Ana sayfada aynı adlı iki bölge olmadığını ölçen test (katalogun bölüm kütüphanesi sayfasında ya da vitrinin ana sayfasında).

## Sınırlar

- Kayan afişin davranışı değişmez.

## Bitti sayılır

- Ana sayfada bölge adları tekil (tarayıcı testi, eski adla kırmızı).

## Durum

yapılacak
