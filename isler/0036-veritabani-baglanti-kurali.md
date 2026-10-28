# 0036 · Veritabanı kullanıcısı yalnız kendi adındaki veritabanına bağlanır

## Amaç

Bugün bir sitenin veritabanı kullanıcısının başka veritabanlarına girememesi, her veritabanında "herkes bağlanabilir" izninin tek tek kaldırılmasıyla sağlanıyor (`komutlar/site-veritabani-ac.sql`). Başka bir yolla açılan bir veritabanında bu izin kalır. PostgreSQL'in bağlantı kurallarına (`pg_hba.conf`) "kullanıcı yalnız kendi adındaki veritabanına girer" kuralı (`sameuser`) eklenince bu koruma her veritabanı için kendiliğinden geçerli olur (değişmez kural 2, karar 0003).

Kart 0011'in bağımsız kontrolünde fark edildi. 0012'den önce ya da onunla birlikte yapılmalı.

## Olmazsa olmazlar

- Yerel PostgreSQL kutusunun bağlantı kuralları: site kullanıcıları yalnız kendi adındaki veritabanına şifreyle bağlanır, yönetici kullanıcısı her yere.
- Aynı kurallar sunucu kurulumunda (0018) da kullanılacak biçimde tek dosyada durur.

## Sınırlar

- Veri ayrımı testinin kendisi 0012'dedir.

## Bitti sayılır

- Yöneticiyle açılmış ve izinleri değiştirilmemiş bir veritabanına site kullanıcısı bağlanamıyor.
- Site kullanıcısı kendi veritabanına bağlanabiliyor, testler geçiyor.

## Durum

yapılacak
