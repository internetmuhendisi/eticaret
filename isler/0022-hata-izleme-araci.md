# 0022 · Hata izleme aracının bağlanması

## Amaç

Canlıdaki hatalar kullanıcıdan önce görülsün. Karar 0013'te açık kalan hata izleme aracı seçilir ve 0014'te bırakılan yere bağlanır (`.claude/rules/hata-izleme.md`).

Önce 0014 ve 0021 bitmiş olmalı.

## Olmazsa olmazlar

- Aracın verisi Avrupa Birliği'nde, tercihen Almanya'da durur (karar 0009). Seçim ve gerekçesi karar kaydına yazılır. Ücretliyse fiyatı kullanıcıya söylenir.
- Kullanıcıdan: araç bir hesap istiyorsa hesabın açılması.
- Her hata site kod adı ve çekirdek sürümüyle etiketlenir.
- Araca giden hatalarda şifre, anahtar, tam e-posta ve telefon yoktur.
- Erişim anahtarı gizli bilgidir (0019).

## Sınırlar

- Uyarıların telefona ya da e-postaya gelmesi ve dışarıdan yoklama bu işe girmez.

## Bitti sayılır

- Deneme sitesinde bilerek çıkarılan hata araçta site adı ve sürümle görünüyor.
- Araçtaki hata kaydında kişisel ya da gizli bilgi olmadığı kontrol edildi.
- Seçimin karar kaydı yazıldı.

## Durum

yapılacak
