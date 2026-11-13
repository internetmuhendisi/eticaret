# 0125 · Bölüm eklemede birden çok kategoriye bağlanırken kilitlenme

## Amaç

Panelden bölüm eklenirken ya da değiştirilirken düzen servisi başvurulan kategori satırlarını paylaşımlı kilitler (`baglariDenetle`, `cekirdek/moduller/duzen/servis.ts`). Kategori kutuları gibi bir bölüm birden çok kategoriye başvurur. Kategori silme de üstü ve altlarını sırayla günceller. İkisi satırları ters sırayla bekleyip kilitlenebilir. Kart 0114'te başlangıç düzeninin kurulumu bu yüzden önce kategori kilidini alır (menülerdeki kuralın aynısı). Bölüm ekleme ve değiştirme bunu yapmıyor; satırları sırasız da okuyor.

Bölüm: Vitrin. Kart 0114'te kurulumun kilidi yazılırken görüldü, ölçülmedi.

## Olmazsa olmazlar

- Önce ölçülür: birden çok kategoriye başvuran bölüm eklemesi ile o kategorilerin birinin altını taşıyan ya da silen kategori işlemi aynı anda, sıra kurularak gerçekten kilitleniyor mu.
- Kilitleniyorsa düzen yazmaları kategoriye başvurduğunda kategori kilidini alır (kilit sırası düzen, kategori, satırlar) ve satırları sırayla kilitler.
- Yarış testi gerçek veritabanıyla, düzeltme bilerek bozulunca kırmızı.

## Sınırlar

- Başlangıç düzeninin kurulumu (kart 0114) değişmez.

## Bitti sayılır

- Ölçümün sonucu yazıldı.
- Kilitlenme varsa düzeltildi ve testte; yoksa nedeni karta yazıldı.

## Ölçüm (2026-11-13)

- Gerçek veritabanıyla, sıra kurularak ölçüldü: üst kategori ve iki alt kategori; bölüm iki alt kategoriye başvuruyor; kategori silme ilk güncellediği alt kategoride bir test işlemiyle tutuldu, bölüm eklemesi öteki alt kategoriyi kilitleyip ilkini bekledi, test işlemi bırakıldı.
- Sonuç: üç ölçümün üçünde veritabanı bölüm eklemeyi "deadlock detected" ile düşürdü. Kilitlenme gerçek.
- Düzeltme: bölüm yazması kategoriye başvurunca önce kategori kilidini alır, satırlar kimlik sırasıyla kilitlenir (karar 0114). Düzeltmeyle üç çalışmanın üçü yeşil, kategori kilidi kaldırılınca üçü kırmızı.
- Aynı kalıp ürünlerin vitrin sırasında da ölçüldü ve kilitleniyor: kart 0159.

## Durum

bitti
