# 0305 · Yerelde birim testleri veritabanının kilit tablosunu dolduruyor

## Amaç

2026-11-24'te bu sunucuda bütün birim takımı 155 testte düştü, hepsi aynı hatayla: PostgreSQL `53200` "out of shared memory", "You might need to increase max_locks_per_transaction". Aynı 38 dosya değişiklik yapılmamış ana dalda da 205 testte düştü: sorun kartın değişikliğinden değil, ortamdandır. Kart 0274 sırasında bulundu, o karta karıştırılmadı.

Ölçülenler:
- Sunucuda 32 işlemci var. Vitest'in işçi sayısı ayarsız olduğu için aynı anda ~31 test dosyası çalışıyor.
- Her gerçek veritabanı testi kendi deneme veritabanını açıyor (`denemeSitesiAc`) ve bütün değişiklikleri tek işlemde uyguluyor (drizzle `migrate`). Site veritabanında bugün 267 tablo, indeks ve dizi var; işlem bunların her biri için kilit tutuyor.
- Yerel veritabanı kutusunda `max_locks_per_transaction` 64, `max_connections` 100: kilit tablosu yaklaşık 6400 kilit taşır. Aynı anda açılan çok sayıda deneme veritabanı bunu aşıyor.
- Kontrol hattında makine iki işlemcilidir, orada görülmedi. Değişiklik sayısı büyüdükçe yerelde daha sık görülecek.

## Olmazsa olmazlar

- Yerelde bütün birim takımı bu hatasız geçer (kaç işçiyle geçtiği ölçülür).
- Çözüm ölçülerek seçilir: yerel kutunun kilit ayarını büyütmek, Vitest'in işçi sayısını sınırlamak ya da deneme veritabanını şablondan kopyalamak. Seçilen yol kontrol hattını yavaşlatmaz.
- Kutu tanımı değişirse kutu kuralı testi (`komutlar/testler/kutu-kurali.test.ts`) ve kural dosyaları aynı değişiklikte güncellenir.

## Sınırlar

- Sunucudaki gerçek sitelerin veritabanı ayarı bu kartın işi değildir.

## Bitti sayılır

- Yerelde bütün birim takımı iki kez art arda bu hatasız geçer.
- Değişiklikten önce aynı takımın hatayla düştüğü ölçülmüştür.

## Durum

yapılacak
