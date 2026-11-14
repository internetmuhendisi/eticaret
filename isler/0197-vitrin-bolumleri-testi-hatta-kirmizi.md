# 0197 · Vitrin bölümleri testi hatta her çalışmada kırmızı

## Amaç

Kontrol hattı 2026-11-13 01:14'ten (kart 0123'ün gönderimi) beri yeşil bitmedi. Son üç tam çalışmada (0130'un gönderimi; kart 0146'nın gönderimi ve yeniden denemesi) `cekirdek/testler/uctan-uca/vitrin-bolumleri.test.ts:294` aynı iletiyle düştü: "Duyuru şeridi alındı. Sırası 4 / 4." duyurusu gelmiyor (sıralanabilir listede klavyeyle taşıma). Ardından aynı dosyadaki "Slider kısayolu" testi (`:410`) 60 saniyelik sınıra takıldı. Dosya yerelde tek başına art arda iki kez 11/11 geçti (2026-11-14).

Hat kırmızıyken arkasındaki adımlar (hız ölçümü, Docker görüntüsü, yerel ortam denemesi) çalışmaz ve yayın yapılamaz (`pnpm hat-sonucu`). Kart 0146'nın hız ölçümü bu yüzden hatta hiç çalışmadı.

Olası sebep (ölçülmedi): `vitrin-cercevesi.test.ts` paylaşılan düzenin üst kısmına geçici bölümler ekliyor; hatta testler paralel çalışırken vitrin bölümleri testinin saydığı bölüm sayısı değişebilir.

Bölüm: Testler.

## Olmazsa olmazlar

- Sebep hattın koşulunda ölçülerek bulunsun (aynı anda çalışan testler, işçi sayısı, sıra); tahmin düzeltilmesin.
- Test paylaşılan düzene bağlı sayı beklemesin ya da düzeni değiştiren testler birbirinden ayrılsın; testin yakaladığı kural zayıflamasın.
- "Slider kısayolu" testinin süre aşımının ilk testin düşüşüne bağlı olup olmadığı ölçülsün.

## Sınırlar

- Sıralanabilir listenin kendi davranışı, ölçüm hata göstermedikçe değişmez (kartlar 0158, 0165).

## Bitti sayılır

- Hat yeşil; dosya hatta art arda en az iki çalışmada geçti.

## Durum

yapılacak
