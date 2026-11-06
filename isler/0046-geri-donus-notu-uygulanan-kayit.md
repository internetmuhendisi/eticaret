# 0046 · Veritabanı geri dönüş notlarında uygulanan kaydı

## Amaç

Geri dönüş notları "silinerek geri alınır" diyor (`0001`, `0002`, `0003`) ama uygulanan değişiklik kaydının (`uygulanan_degisiklikler`) ne olacağını söylemiyor. Yalnız tablolar silinirse kayıt yerinde kalabilir; sonraki yayında değişiklik uygulanmaz ve o tabloları kullanan uçlar hata verir. Bu kod okunarak çıkarıldı, ölçülmedi (kart 0026'nın bağımsız kontrolü).

## Olmazsa olmazlar

- Önce ölçülür: tablo elle silinince sonraki güncellemede ne oluyor.
- Geri dönüşün nasıl yapılacağı tek yerde yazılır (`.claude/rules/veritabani.md`), notlar oraya dayanır. Uygulanmış değişiklik dosyaları değiştirilmez.

## Sınırlar

- `pnpm geri-don` komutunun davranışı bu işte değişmez, ölçüm bir hata gösterirse ayrı kart yazılır.

## Bitti sayılır

- Ölçümün sonucu karta ya da karar kaydına yazıldı.
- Geri dönüş yolu belgede yazıyor.

## Durum

yapılacak
