# 0229 · Ödeme yöntemi servisi ayarı kilidin dışında okuyup bütün değeri yazıyor

## Amaç

Kart 0224'ün bağımsız kontrolü buldu: `odemeYontemiServisi` (`cekirdek/moduller/odeme/yontemler.ts`) mağaza ayarını kilidin dışında okuyor, sonra bütün değeri (yöntem listesi ya da bütün banka hesapları) yazıyor. Kilit yalnız yazmanın işleminde alınıyor. Aynı anda gelen iki değişiklikte, sonra yazan öncekinin sonucunu görmeden eski okumasını yazar. Kart 0224 yalnız yeni sıralama işlevini düzeltti (kilidin içinde okuma, `degistir`'e işlev verilerek).

Olası sonuçlar (kod okumasıyla, ölçülmedi):
- **Banka hesabı:** iki yönetici aynı anda hesap eklerse ya da biri eklerken öteki sıralarsa bir hesap kaybolabilir (`hesapEkle`, `hesapDegistir`, `hesapSil`, `hesaplariSirala`).
- **"En az bir yöntem" kuralı:** aynı anda son hesap silinirken havale tek yöntem olarak kaydedilirse, kural iki ayrı okumayla geçip birlikte ihlal edilebilir (`yontemleriDegistir` ile `hesapSil`).

## Olmazsa olmazlar

- Önce ölçülür: kart 0224'ün servis testindeki gibi açık duran ayar işleminin arkasında kilitte bekleyerek, her işlev için yarış kurulur.
- Düzeltme kart 0224'ün yoluyla yapılır: değer `degistir`'e işlev olarak verilir, okuma ve kurallar kilidin içinde çalışır.
- Mağaza ayarı servisini kullanan öteki modüllerde aynı kalıp aranır (okuyup bütün değeri yazan).

## Sınırlar

- Ödeme yöntemlerinin ve banka hesaplarının kuralları değişmez.

## Bitti sayılır

- Her yarış testi düzeltmeyle yeşil, eski okumayla kırmızı.
- Kontrol hattı yeşil.

## Durum

yapılacak
