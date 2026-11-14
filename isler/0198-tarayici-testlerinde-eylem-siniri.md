# 0198 · Tarayıcı testlerinde eylem sınırı

## Amaç

Playwright'ta tıklama, odaklanma ve yazma gibi eylemlerin kendi süre sınırı yoktur. Bulunamayan bir öğeyi bekleyen eylem testin 60 saniyelik sınırına kadar bekler. Sınır dolunca dosyanın veritabanı bağlantısı kapanır (`afterAll` içinde `vt.$client.end()`). Testin `finally` içindeki temizliği bu yüzden "Cannot use a pool after calling end on the pool" ile düşer.

Kart 0197'de ölçüldü: bu ileti takılan eylemi gizler ve testin eklediği kayıtlar paylaşılan veritabanında kalır. Hattaki "Slider kısayolu" süre aşımında da (`vitrin-bolumleri.test.ts`) yalnız bu ileti görünüyordu. Kart 0197 sınırı yalnız o dosyaya koydu (`test.use({ actionTimeout: 15_000 })`).

Aynı kalıbı taşıyan dosyalar (2026-11-14): `arama`, `bos-sayfalar`, `durum-sayfalari`, `kayit-sayfalari`, `menuler`, `urun-listesi`, `urun-sayfasi`, `vitrin-cercevesi` (`cekirdek/testler/uctan-uca/`).

Bölüm: Testler.

## Olmazsa olmazlar

- Eylem sınırı tek yerde tanımlansın (büyük olasılıkla `playwright.config.ts`), dosyalar kendi kopyasını yazmasın; kart 0197'nin dosya içi sınırı ona taşınsın.
- Sınırın değeri hattın yavaşlığında ölçülerek seçilsin: hiçbir geçen test bu sınırla düşmesin.
- Takılan bir eylemin kendi iletisiyle düştüğü ve temizliğin artık bırakmadığı bir bozmayla gösterilsin.

## Sınırlar

- Beklentilerin kendi sınırı (5 saniye) ve testin süre sınırı (60 saniye) değişmez.
- Testlerin kendi davranışı değişmez.

## Bitti sayılır

- Eylem sınırı ayarda, dosyalarda kopyası yok.
- Bütün tarayıcı testleri hatta yeşil.
- Bozma örneği kayıtta.

## Durum

yapılacak
