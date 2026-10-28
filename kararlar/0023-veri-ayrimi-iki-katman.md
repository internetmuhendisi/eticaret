# 0023 · Veri ayrımı iki katmanlıdır: izinler ve bağlantı kuralları

## Tarih

2026-10-28

## Karar

Bir sitenin veritabanı kullanıcısının yalnız kendi veritabanına girebilmesi iki ayrı katmanla sağlanır (değişmez kural 2, karar 0003):

1. **İzinler.** Site kurulurken her veritabanından "herkes bağlanabilir" izni kaldırılır, yalnız sitenin kendi kullanıcısına verilir. PostgreSQL'in kendi veritabanlarından (`postgres`, `template1`) da bu izin kaldırılır (`komutlar/site-veritabani-ac.sql`, karar 0022).
2. **Bağlantı kuralları.** PostgreSQL'in bağlantı kuralları imajın varsayılanı yerine projenin dosyasından okunur (`sunucu/veritabani/pg_hba.conf`). Site kullanıcısı yalnız kendi adındaki veritabanına şifreyle bağlanabilir (`sameuser`). Yönetici kutunun içinden şifresiz, dışından şifreyle girer. Başka her bağlantı reddedilir. Yerel kutu ve sunucu aynı dosyayı kullanır.

Veri ayrımı testi (`cekirdek/testler/veri-ayrimi.test.ts`) her çalıştırmada iki deneme sitesi açar. İki katmanı ayrı ayrı denetler, biri bozulunca kırmızıya düşer. Test her yayında `pnpm testler` ile çalışır.

## Neden

- Tek katman tek hatayla çöker. Bir veritabanının izni unutulursa, ya da bir veritabanı site kurma komutu dışında açılırsa, bağlantı kuralı yine korur. Bağlantı kuralı yanlışlıkla gevşetilirse izinler yine korur.
- Kuralın adla eşleşmesi (veritabanı adı = kullanıcı adı, `site_<kod adı>`) karar 0022'deki adlandırmayla zaten sağlanıyor. Ek bir liste tutmak gerekmez, yeni site için kural dosyası değişmez.
- İmajın varsayılan kuralları kutunun içinden (127.0.0.1) gelen bağlantıya şifresiz izin veriyordu. Projenin dosyası bunu da kapatır.
- Testin iki katmanı ayrı denetlemesi, bir katman sessizce bozulduğunda öteki koruduğu için sorunun gizli kalmasını önler. Bu, bilerek bozma denemeleriyle gösterildi: yalnız izin açılınca izin testi, yalnız kural gevşetilince kural testi, ikisi birden bozulunca gerçek sızıntı testi kırmızıya düştü.

## Düşünülen diğer yollar

- Yalnız izinler: Seçilmedi. Gerekçesi yukarıda, tek katmandır.
- Her siteye ayrı PostgreSQL kutusu: Seçilmedi (karar 0013), her kutu ayrı bellek harcar.
- Bağlantı kurallarında her site için ayrı satır: Seçilmedi. Site eklendikçe dosya değişir, unutulabilir. `sameuser` bütün siteleri tek satırla kapsar.

## Sonuçları

- Bağlantı kuralları dosyası değişince veritabanı kutusu yeniden başlatılır. Kutu dosyayı açılışta bağlar, sonraki değişikliği her zaman görmez.
- Veritabanı adı ile kullanıcı adı aynı kalmak zorundadır. Bu ad biçimi değişirse bağlantı kuralı da değişir.
- Sahip paneli sitelerin veritabanlarına bağlanmaz (karar 0012), bu kurallarda ona yer yoktur.
- Her site uygulaması yalnız kendi `VERITABANI_ADRESI`'ni alır. Bir site kutusunun başka sitenin adresini görmemesi kutular kurulurken sağlanır (kartlar 0016, 0019).
