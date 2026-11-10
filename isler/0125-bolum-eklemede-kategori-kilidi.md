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

## Durum

yapılacak
