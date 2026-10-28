# 0026 · İzinler ve roller

## Amaç

Her işlemin bir izni olur, roller bu izinlerden kurulur. Kapı her istekte isteyenin o izne sahip olup olmadığını kontrol eder (`.claude/rules/yetki.md`).

Önce 0025 bitmiş olmalı.

## Olmazsa olmazlar

- İzinler her modülün `izinler.ts` dosyasında, tek bir kayıtta toplanır.
- Her iznin kapsamı yazar: kendi kayıtları, ekibi ya da tümü.
- Roller izinlerden oluşur. Kodda rol adına göre kontrol yazılmaz.
- Başlangıç rolleri `cekirdek/moduller/ekip/` altında: tam yetkili mağaza sahibi ve en az bir sınırlı rol. Rollerin tabloları numaralı değişiklik dosyasıyla açılır.
- Kapı 0013'te yazılan izin beyanını her istekte kontrol eder. İzni olmayana yetki hata koduyla döner.
- Müşteri girişi yalnız müşterinin kendi kayıtlarına erişir.

## Sınırlar

- Panelde rol düzenleme ekranı yapılmaz.
- Sahip girişinin anahtarı sahip paneliyle gelir.
- Bütün uçlarda rol testi 0030'dur.

## Bitti sayılır

- İzni olan rol örnek yönetici ucuna erişiyor, izni olmayan yetki hatası alıyor. Testler gerçek veritabanıyla çalışıyor.
- Kodda rol adına göre yazılmış bir kontrol yok.
- İzinlerin ve rollerin listesi belgeye yazıldı.

## Durum

yapılacak
