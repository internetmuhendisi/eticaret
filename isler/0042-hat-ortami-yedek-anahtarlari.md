# 0042 · Kontrol hattının yedek anahtarlarında durması

## Amaç

Kart 0024 `.env.example` dosyasına iki yeni anahtar ekledi ama hattın ortam hazırlığı bunları üretmiyor. Hat ilk adımlarından birinde kırmızı duruyor, yeşil hat olmadan yayın yapılamıyor. Ana daldaki kayıt: `7372d36`.

## Olmazsa olmazlar

- `komutlar/hat-ortami-hazirla.mts` iki anahtarı boş üretir: hatta depo anahtarı yoktur, yedek komutları hatta çalışmaz.
- Aynı hata göndermeden önce yakalanır: `.env.example` ile hat ortamının anahtarları aynı değilse birim testi kırmızıdır, bozuk örneği testte durur.

## Sınırlar

- Hattın başka adımı değiştirilmez.
- Yedek işinin kendisi değiştirilmez.

## Bitti sayılır

- Bilerek eklenen fazla anahtarı test yakalıyor.
- Ana daldaki kaydın hattı GitHub'da yeşil.
- `pnpm hat-sonucu` yeşil diyor.

## Durum

bitti
