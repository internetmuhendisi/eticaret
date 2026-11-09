# 0102 · Tasarım değerleri ve Tailwind CSS

## Amaç

Renk, yazı tipi ve ölçünün tek bir yeri olur, vitrin ve panel bunları Tailwind CSS 4 üzerinden kullanır. Kodda rastgele renk ya da ölçü yazılamaz.

Bölüm: Tasarım. Önce 0101 bitmiş olmalı.

## Olmazsa olmazlar

- Tailwind CSS 4. sürüm çekirdeğe, bileşen kütüphanesine ve sahip paneline kurulur.
- Tasarım değerleri tek dosyada tanımlanır: anlamlı renk adları (birincil, zemin, yazı, kenar, tehlike gibi), koyu tema değerleri, yazı tipleri, yazı ölçeği, boşluk ölçeği, köşe yarıçapları, gölgeler, katman sırası, genişlik sınırları.
- Tailwind'in kullanabildiği değerler yalnız bunlardır. Hazır palet (`red-500` gibi), köşeli parantezli serbest değer (`w-[37px]`, `bg-[#fff]`) ve tanımsız ölçü kullanılamaz.
- Değerler sitenin temasından gelir. Bir site kendi değerlerini yalnız temanın izin verdiği yerde değiştirir. Birleşim tek yerde üretilir, bileşenler sonucu okur.
- Kod denetimi ham renk yasağına ek olarak serbest Tailwind değerini, hazır paleti ve satır içi stilde ölçüyü de yakalar. Her yasağın bozuk örneği vardır.
- Yazı tipleri sitede barındırılır, dış sunucudan yüklenmez.
- Mevcut form bileşenleri sistem renklerinden tasarım değerlerine bağlanır.
- Karar kaydı yazılır (Tailwind ile değerlerin bağlanış biçimi ve kapatılan Tailwind özellikleri).
- Tasarım sistemi belgesi ve kontrol tablosu aynı değişiklikte güncellenir.

## Sınırlar

- shadcn/ui bileşenleri bu kartta eklenmez (0103).
- Tema seçimi ve mağaza sahibinin tema ayarları bu kartta yazılmaz (0105).

## Bitti sayılır

- Her değer tek dosyada, açık ve koyu temada tanımlı.
- Ham renk, hazır palet, serbest değer ve satır içi ölçü yazan örnek denetimde kırmızı (denetim kendi testi).
- Form bileşenleri açık ve koyu temada tasarım değerleriyle görünüyor, kontrastı ölçüldü.
- Yazı tipi dış sunucuya istek atmadan yükleniyor.

## Durum

bitti
