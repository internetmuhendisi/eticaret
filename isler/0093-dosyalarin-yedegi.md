# 0093 · Dosyaların yedeği ve geri yüklenmesi

## Amaç

Kart 0072 her sitenin dosyalarını sunucunun diskinde, sitenin kendi klasöründe tutuyor. Gece yedeği bugün yalnız veritabanını alıyor (karar 0037). Dosyalar da sitenin yedeğine girmeli, site tek başına, veritabanı ve dosyalarıyla birlikte geri yüklenebilmeli. Kullanıcının kararıyla bu iş kart 0072'den ayrıldı.

Önce 0072 bitmiş olmalı. Bu kart bitmeden gerçek bir mağazaya dosya yüklenmez.

Bölüm: Yeni mağaza. On altıncı bölümde açık kartlardan bu bölüme alındı (önce Yönetim paneli); demo içe aktarma (kart 0347) mağazaya görsel yazdığı için ondan önce.

## Olmazsa olmazlar

- Dosyalar veritabanı yedeğiyle aynı depoya, aynı şifreleme (site başına `age` anahtarı) ve aynı silme kilidiyle gider.
- Dosyalar değişmediği için her gece hepsi yeniden gönderilmez; yöntem ve saklama süresi karar kaydına yazılır, depo ücretine etkisi hesaplanır.
- Geri yükleme veritabanı ile dosyaları tutarlı bir ana döndürür: veritabanında kaydı olan her dosya yerindedir.
- Geri yüklemenin yarıda kalması siteyi bozuk bırakmaz (karar 0037'deki kurallar dosyalar için de geçerlidir).
- Sunucu denetimi dosya yedeğinin de son 26 saatte başarılı olduğunu ölçer.
- Prova dosyaları da karşılaştırır: kayıt sayısı ve içerik özetleri.
- Kaydı olmayan dosyaları (süreç kaydetme sırasında ölürse kalabilir, karar 0058) kalıcı silinme zamanı gelmiş işaretli dosyaları ve hiçbir kaydın kullanmadığı silinmemiş dosyaları (örneğin aynı anda iki logo değiştirmesinden kalan, karar 0059) bulan bir temizlik; kayıtsız dosya önce bildirilir, kendiliğinden silinmez.
- Hiçbir siparişe bağlanmamış fatura belgeleri de bu temizliğe girer (kart 0268, karar 0170): PDF seçilince hemen kaydedilir, pencere Vazgeç'le kapanır ya da dosya değiştirilirse ilk belge sahipsiz ve silinmemiş kalır. Ad ve adres taşıdığı için belli bir süreden (ör. bir gün) eski sahipsiz belge silinmiş işaretlenir, kalıcı silme öteki dosyalarla aynı yoldan; kişisel veri saklama süresine (karar 0145) aykırı kalmaz.

## Sınırlar

- Görsel küçültme ve galeri 0087'dedir.

## Bitti sayılır

- `pnpm yedek-denemesi` dosyalı bir geçici sitede yedek alıp geri yüklüyor; geri yüklenen sitenin dosyaları yerinde ve içerikleri aynı.
- Başka sitenin anahtarı dosya yedeğini açamıyor, süresi dolmamış dosya yedeği silinemiyor.
- Kontroller tablosunun yedek satırı güncel.

## Durum

yapılacak
