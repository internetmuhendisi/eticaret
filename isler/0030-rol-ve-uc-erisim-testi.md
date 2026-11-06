# 0030 · Her rolün her uçtaki erişim testi

## Amaç

Hiçbir uç yanlış role açık kalmasın. Uç listesi uygulamanın kendisinden okunur, her rol her uçta gerçek veritabanıyla denenir (`.claude/rules/yetki.md`, `.claude/rules/test.md`).

Önce 0026 ve 0029 bitmiş olmalı.

## Olmazsa olmazlar

- Test uç listesini elle yazılmış bir listeden değil, uygulamanın kayıtlı uçlarından okur.
- Her rol (girişsiz ziyaretçi, müşteri, her yönetici rolü) her uçta denenir. Beklenen sonuç izin kaydından çıkar.
- Müşteri başka bir müşterinin kaydına erişemez.
- Yeni bir uç eklenince test kendiliğinden onu da kapsar.

## Sınırlar

- Yeni uç yazılmaz.

## Bitti sayılır

- Erişim testi geçiyor ve kontrol hattında çalışıyor.
- Bir uca bilerek yanlış izin yazılınca test kırmızıya düşüyor.
- Yeni eklenen bir örnek uç test listesine kendiliğinden giriyor.

## Durum

bitti
