# 0007 · Test araçları ve ilk test

## Amaç

Karar 0013'te açık kalan test araçları seçilir. Birim testleri ve tarayıcıda tıklayarak deneyen testler tek komutla çalışır (`.claude/rules/test.md`).

Önce 0005 bitmiş olmalı.

## Olmazsa olmazlar

- Birim ve entegrasyon testleri için bir araç, tarayıcı testleri için bir araç seçilir. Seçim karar kaydına yazılır.
- Testler `*.test.ts` ve `*.test.tsx` adlarıyla bulunur.
- Tek komutla bütün testler çalışır, kırmızı test komutu başarısız bitirir.
- Her araçtan bir örnek test.

## Sınırlar

- Gerçek veritabanıyla çalışan testler veritabanı kurulunca yazılır (0011, 0012).
- Tarayıcı testi için gerçek sayfa 0009'da gelir. Bu işte araç yalnız kurulur.

## Bitti sayılır

- Test komutu geçiyor.
- Bilerek bozulan bir test komutu kırmızıya düşürüyor.
- Test araçlarının karar kaydı yazıldı.

## Durum

yapılacak
