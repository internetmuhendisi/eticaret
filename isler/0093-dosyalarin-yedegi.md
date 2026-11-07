# 0093 · Dosyaların yedeği ve geri yüklenmesi

## Amaç

Kart 0072 her sitenin dosyalarını sunucunun diskinde, sitenin kendi klasöründe tutuyor. Gece yedeği bugün yalnız veritabanını alıyor (karar 0037). Dosyalar da sitenin yedeğine girmeli, site tek başına, veritabanı ve dosyalarıyla birlikte geri yüklenebilmeli. Kullanıcının kararıyla bu iş kart 0072'den ayrıldı.

Önce 0072 bitmiş olmalı. Bu kart bitmeden gerçek bir mağazaya dosya yüklenmez.

## Olmazsa olmazlar

- Dosyalar veritabanı yedeğiyle aynı depoya, aynı şifreleme (site başına `age` anahtarı) ve aynı silme kilidiyle gider.
- Dosyalar değişmediği için her gece hepsi yeniden gönderilmez; yöntem ve saklama süresi karar kaydına yazılır, depo ücretine etkisi hesaplanır.
- Geri yükleme veritabanı ile dosyaları tutarlı bir ana döndürür: veritabanında kaydı olan her dosya yerindedir.
- Geri yüklemenin yarıda kalması siteyi bozuk bırakmaz (karar 0037'deki kurallar dosyalar için de geçerlidir).
- Sunucu denetimi dosya yedeğinin de son 26 saatte başarılı olduğunu ölçer.
- Prova dosyaları da karşılaştırır: kayıt sayısı ve içerik özetleri.
- Kaydı olmayan dosyaları (süreç kaydetme sırasında ölürse kalabilir, karar 0058) ve kalıcı silinme zamanı gelmiş işaretli dosyaları bulan bir temizlik; kayıtsız dosya önce bildirilir, kendiliğinden silinmez.

## Sınırlar

- Görsel küçültme ve galeri 0087'dedir.

## Bitti sayılır

- `pnpm yedek-denemesi` dosyalı bir geçici sitede yedek alıp geri yüklüyor; geri yüklenen sitenin dosyaları yerinde ve içerikleri aynı.
- Başka sitenin anahtarı dosya yedeğini açamıyor, süresi dolmamış dosya yedeği silinemiyor.
- Kontroller tablosunun yedek satırı güncel.

## Durum

yapılacak
