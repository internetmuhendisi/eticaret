# 0069 · Mağaza sahibinin ayarları veritabanında

## Amaç

Mağaza sahibinin ayarları sitenin veritabanında durur, site klasöründe yalnız başlangıç değerleri olur (karar 0010). Bu düzen bugün yok; vergi, fiyat ve stok ayarları bunun üstüne kurulacak (temel paket: Mağaza ayarları).

## Olmazsa olmazlar

- Ayar şeması mağaza sahibinin ayarlarını da türü, varsayılanı, açıklaması ve "kim değiştirir" bilgisiyle tanımlar (`cekirdek/ayar-semasi/ayarlar.ts`).
- Site klasöründe `baslangic/` altında başlangıç değerleri durur, `pnpm site-dogrula` bunları şemadan geçirir.
- Başlangıç değerleri site kurulurken veritabanına bir kez yazılır, sonra okunmaz. İkinci çalıştırma veritabanındaki değeri ezmez.
- Ayarı okuyan ve değiştiren tek servis vardır. Değer verilmemişse varsayılan döner.
- Her değişiklik değişiklik kaydına aynı veritabanı işleminde yazılır (karar 0045).
- Ayarı değiştirmek bir izin ister, izin belgeye yazılır.

## Sınırlar

- Ayar ekranı yazılmaz. Ekranlar ve onların uçları panel bölümüyle gelir.
- Vergi, fiyat ve stok ayarları kendi kartlarında eklenir, bu kart yalnız düzeni kurar.
- Altyapı sahibinin ayarları yerinde kalır.

## Bitti sayılır

- Başlangıç değeri veritabanına bir kez yazılıyor, ikinci çalıştırmada değişmiyor (gerçek veritabanıyla test).
- Şemada olmayan ya da yanlış türdeki başlangıç değeri `pnpm site-dogrula`'da kırmızı.
- Değer yokken varsayılan, değer varken veritabanındaki geliyor.
- Değişiklik kaydı yazılıyor, iki site birbirinin ayarını görmüyor.

## Durum

çalışılıyor
