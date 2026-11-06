# 0051 · Paralel testlerde veritabanı açma çakışması

## Amaç

Kart 0049 sırasında `pnpm birim-testleri` bazı koşularda `cekirdek/kapi/testler/izin-kontrolu.test.ts` dosyasında kırmızıya düştü: `psql:<stdin>:32: ERROR: tuple concurrently updated`. Satır, `komutlar/site-veritabani-ac.sql` içindeki `REVOKE CONNECT ON DATABASE template1 FROM PUBLIC`: paralel test dosyaları ortak kaydı aynı anda değiştiriyor. Ölçüm: kart 0049'un çalışma kopyasında 3 koşunun 2'si kırmızı, tek başına ve ana dalda 5 koşunun 5'i yeşil. Neden çalışma kopyasında daha sık olduğu ölçülmedi. Aralıklı kırmızı, testleri tekrar tekrar çalıştırma alışkanlığı yaratır.

## Olmazsa olmazlar

- Önce yarış ana dalda da bilerek tekrarlanır.
- Düzeltme test koşusunu da sunucudaki kurulumu da kapsar; aynı betik ikisinde de kullanılıyor.

- Çakışmada geride kalan geçici test veritabanları da temizlenir (kart 0028'in kontrolünde yerelde 9 tane görüldü).

## Sınırlar

- Veritabanı ayrımı kuralları zayıflatılmaz: `template1` ve `postgres` bağlantıları kapalı kalır.

## Bitti sayılır

- Paralel açma bilerek zorlanınca çakışma çıkmıyor. Ölçüldü.
- `pnpm birim-testleri` üst üste en az 10 koşuda yeşil.

## Durum

yapılacak
