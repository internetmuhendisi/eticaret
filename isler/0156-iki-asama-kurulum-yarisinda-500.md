# 0156 · İki aşamalı giriş kurulumunda aynı anda gelen iki onaydan biri 500 aldı

## Amaç

Kart 0138'in kapanış kontrolünde (2026-11-12), bütün birim takımında `cekirdek/kapi/testler/iki-asamali-giris.test.ts` içindeki "iki ayrı ara adımdan aynı anda gelen onaydan yalnız biri geçer" testi kırmızı oldu: yanıtlar `[200, 500]` geldi, beklenen `[200, 422]`. Takımın 2669 testinden yalnız bu düştü. Aynı kodla dosya tek başına üç kez çalıştırılınca 29 testin hepsi geçti. Kart 0138 kapıya ve oturum modülüne dokunmadı.

500 beklenmeyen bir hatadır: yük altında iki kurulum onayının yarışında servisin bilinen hata yerine yakalanmamış bir hata (örneğin kilit ya da tekillik çakışması) verdiği düşünülüyor. Bu bir tahmindir, ölçülmedi. Test `sessiz()` ile günlüğü kapattığı için hatanın kendisi kayıtta yok.

Bölüm: Altyapı (giriş). Benzer: kart 0154, 0118 (yük altında yarış testleri), karar 0044.

## Olmazsa olmazlar

- Önce yeniden üretilir: test yük altında tekrar tekrar çalıştırılır, 500'ün geldiği durumda hatanın kendisi (ad, ileti, veritabanı kodu) kaydedilir.
- Sebep yarışsa servis o durumda bilinen hatayı (422) döner; düzeltme gerçek veritabanıyla, yarış sıra kurularak test edilir.
- Sebep yalnız testin zamanlamasıysa, ölçümle gösterilir ve test güçlendirilir.

## Sınırlar

- İki aşamalı girişin akışı ve kuralları değişmez.

## Bitti sayılır

- 500'ün sebebi ölçülüp yazıldı.
- Yarış sıra kurularak testte; düzeltme geri alınınca kırmızıya düşüyor.

## Durum

yapılacak
