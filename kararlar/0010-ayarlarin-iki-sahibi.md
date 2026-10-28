# 0010 · Ayarların iki sahibi var

## Tarih

2026-10-28

## Karar

Her site ayarının bir sahibi vardır: altyapı sahibi ya da mağaza sahibi. Altyapı sahibinin ayarları site klasöründe durur, kayıt ve yayınla değişir. Mağaza sahibinin ayarları sitenin veritabanında durur, panelden değişir. Mağaza sahibinin ayarlarının site klasöründe yalnız başlangıç değerleri olur, bunlar site kurulurken veritabanına bir kez aktarılır.

Yalnız altyapı sahibinin değiştirdiği ayarlar: satış ve teslimat ülkesi, dil, para birimi ve biçimi, saat dilimi, ağırlık ve boyut birimi, sipariş numarası öneki ve başlangıcı, "Mağaza sahibi temayı değiştirebilir", "Vitrinde altyapı adı". Geri kalan bütün ayarları mağaza sahibi değiştirir.

## Neden

- Mağaza sahibi koda ve sunucuya erişmez (0001). Panelden değiştirdiği bir ayar dosyada duramaz, veritabanında durmalı.
- Para birimi, dil ya da sipariş numarası satış yapan bir mağazada değişirse eski fiyatlar, siparişler ve faturalar tutarsız kalır. Bu ayarlar kontrollerden geçen bir yayınla değişmeli.
- Her değerin tek bir asıl yeri olur. Başlangıç değeri kurulumdan sonra okunmaz, böylece dosya ile veritabanı birbiriyle yarışmaz.

## Düşünülen diğer yollar

- Bütün ayarlar site klasöründe: Seçilmedi. Mağaza sahibi kargo ücreti gibi günlük bir değişiklik için bile altyapı sahibini beklerdi.
- Bütün ayarlar veritabanında: Seçilmedi. Para birimi gibi riskli ayarlar kontrolsüz ve kayıtsız değişebilirdi, sitenin kuruluş ayarları kodla birlikte izlenemezdi.

## Sonuçları

- Ayar şemasında her ayarın türü ve varsayılanının yanında "kim değiştirir" bilgisi de durur. Panel yalnız mağaza sahibinin ayarlarını gösterir.
- Mağaza sahibinin bir ayarı klasördeki başlangıç değeri değiştirilerek sonradan düzeltilemez. Kurulmuş sitede bu değişiklik panelden ya da bir veri değişikliğiyle yapılır.
- Ana sayfa düzeni de mağaza sahibinin ayarıdır: ilk düzen klasörde başlangıç değeri olarak, sonraki hâli veritabanında durur.
- Plan: `planlar/cekirdek-ve-siteler.md`. Ayarların listesi: `planlar/site-ayarlari.md`.
