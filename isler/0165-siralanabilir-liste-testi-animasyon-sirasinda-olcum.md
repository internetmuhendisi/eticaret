# 0165 · Sıralanabilir liste testi yana kaymayı animasyon sırasında ölçüyor

## Amaç

`cekirdek/testler/uctan-uca/katalog.test.ts` içindeki "sıralanabilir liste: klavyeyle, düğmeyle ve fareyle taşınır" testi ara sıra kırmızıya düşüyor. Kart 0143 sırasında ölçüldü:

- Ana daldaki kodla (kart 0143'ün değişikliği olmadan) sekiz denemede üç kez düştü.
- Hata her seferinde aynı: telefon genişliğinde "yukarı al" düğmesine basıldıktan sonra sayfa 287 piksel yana kayıyor (`scrollWidth - clientWidth`).
- Taşan öğe az önce taşınan satırın kendisi (`siralanabilir-satir`, "Güven şeridi"; sağ kenarı 662 piksel). Ölçüm, @dnd-kit'in sıralama geçişi sürerken yapılıyor. Satır o sırada geçici bir kaydırmayla (transform) duruyor; pencere hemen önce 1280 pikselden 375 piksele küçültülmüştü.

Neden kesin değildir: satırın kaydırması geçiş bitince sıfırlanıyor mu, yoksa bir kullanıcı da bu anda yana kayma görüyor mu, ölçülmedi.

## Olmazsa olmazlar

- Önce ölçülür: pencere küçültülmeden de (yalnız telefonda) olur mu; geçiş bitince kayma kalıyor mu.
- Kullanıcının gördüğü bir sorunsa parça düzeltilir; yalnız ölçüm zamanlamasıysa test geçişin bitmesini bekler (kart 0136'daki tarama beklemesi gibi).

## Sınırlar

- Sıralanabilir listenin davranışı değişmez.

## Bitti sayılır

- Neden ölçülüp karta yazıldı.
- Test art arda en az on kez düşmeden geçiyor.

## Durum

yapılacak
