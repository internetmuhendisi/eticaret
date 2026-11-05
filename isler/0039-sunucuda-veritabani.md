# 0039 · Sunucuda veritabanı

## Amaç

Yayın komutu (0021) sitenin veritabanına değişiklikleri uygulayarak başlar, ama sunucuda henüz veritabanı yok. Bu iş sunucuda deneme ortamının veritabanını açar, her sitenin kendi veritabanını ve kullanıcısını kurar ve değişiklikleri sunucuda uygulanabilir yapar.

Kart 0021'in planı yapılırken önkoşul olarak ayrıldı. Önce 0019, 0020 ve 0038 bitmiş olmalı (hepsi bitti).

## Olmazsa olmazlar

- Sunucuda deneme ortamının veritabanı kutusu: yerel ortamla aynı PostgreSQL sürümü ve aynı bağlantı kuralları (`sunucu/veritabani/pg_hba.conf`, karar 0023), verisi sunucuda kalıcı bir klasörde, yeniden başlama kuralı `kaliciKutu` (karar 0033), portu dışarıya kapalı.
- Kutu tanımı tek yerde yazılır ve `komutlar/testler/kutu-kurali.test.ts`'teki kalıcı dosyalar listesine girer.
- Veritabanı yönetici şifresi sunucuda üretilir, dosyada durur, bilgisayara gelmez (karar 0031'in kuralları).
- Sitenin veritabanı ve kullanıcısı sunucuda açılır. Kullanıcının şifresi sitenin gizli bilgi dosyasından (`veritabani_adresi`) okunur ve sunucudan çıkmaz. Komut tekrar çalıştırılabilir.
- Gizli bilgi yenilenince (`pnpm sunucu-gizli --yenile`) veritabanı kullanıcısının şifresi de aynı adımda değişir.
- Veritabanı değişiklikleri sunucuda, sitenin kendi kutu kullanıcısıyla ve kendi gizli bilgi dosyasıyla uygulanır. Uygulayan parça çekirdeğin görüntüsündedir ve görüntü denetiminden geçer. Notsuz, sırası bozuk ya da sonradan değişmiş değişiklik sunucuda da uygulanmaz (karar 0011).
- Her sitenin kutusu yalnız kendi veritabanına bağlanabilir. Sunucuda iki siteyle ölçülür.
- `pnpm sunucu-denetle` veritabanı kutusunu ölçer: çalışıyor, kuralı doğru, portu dışarıya kapalı, yönetici şifre dosyasının izinleri doğru.

## Sınırlar

- Yayın komutu, site kutusunun açılması ve ön kapıya bağlanması bu işe girmez (0021).
- Canlı ortamın veritabanı açılmaz. Yalnız deneme ortamı (kullanıcı kararı). Kod yine de yalnız denemeye göre yazılmaz, ortamı dışarıdan alır; canlı ortam aynı komutla açılabilir.
- Gece yedeği ve geri yükleme bu işe girmez (0024).

## Bitti sayılır

- Sunucuda deneme ortamının veritabanı kutusu çalışıyor; yeniden başlama kuralını ve portunun dışarıya kapalı olduğunu `pnpm sunucu-denetle` ölçüyor.
- Bir deneme sitesinin veritabanı sunucuda komutla açılıyor ve değişiklikleri uygulanıyor. Komut ikinci kez çalışınca bir şey değişmiyor.
- Bir sitenin kullanıcısı başka bir sitenin veritabanına giremiyor (sunucuda ölçüldü).
- Gizli bilgi yenilenince site yeni şifreyle bağlanıyor, eski şifreyle bağlanamıyor.
- Veritabanı şifreleri bilgisayara ve kayıt geçmişine girmiyor (`pnpm sunucu-denetle` yeşil).

## Durum

bitti
