# 0160 · Bölüm formunda görsel yükleme

## Amaç

Kart 0142'de vitrin bölümlerinin görsel alanı yalnız sitede kayıtlı görsellerden seçim yapar (kullanıcı kararı, karar 0115). Mağaza sahibi yeni bir slider ya da afiş görselini panelden yükleyemiyor. Yükleme, görsel seçme penceresinin içinden yapılabilmeli.

Önce 0094 (logo yükleme ucu ve kutuların bellek sınırı) ve 0093 (dosyaların yedeği) bitmiş olmalı: ikisi yüklemenin altyapı koşullarını kurar.

## Olmazsa olmazlar

- Yönetici girişinde görsel yükleme ucu; izni karar kaydında seçilir (`duzen.degistir` ya da ayrı bir dosya izni). Uç belgesi ve erişim testi.
- Yükleme ortak yükleme bileşeniyle yapılır, ilerleme ve iptal vardır (`.claude/rules/formlar.md`). Bileşen kütüphaneye ve kataloğa girer.
- Yüklenen görsel `gorselKaydet` ile boyutlarıyla kaydedilir ve seçme penceresinde en başta görünür, seçili gelir.
- Sınırı aşan ve izinsiz türdeki dosya anlaşılır hatayla reddedilir (`dosyaHatalari`).

## Sınırlar

- Kullanılmayan görsellerin temizliği bu işe girmez (kart 0093).

## Bitti sayılır

- Tarayıcı testi slider formunda görsel yüklüyor, seçiyor, kaydediyor; görsel vitrinde görünüyor.
- Sınırı aşan ve izinsiz türdeki dosya ekranda anlaşılır hatayla reddediliyor.
- Yükleme klavyeyle yapılabiliyor, iki temada ve üç genişlikte taramadan geçiyor.

## Durum

yapılacak
