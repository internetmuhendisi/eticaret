# 0054 · İki aşamalı giriş anahtarının kaybı fark edilsin

## Amaç

`IKI_ASAMA_ANAHTARI` kaybolursa (dosya silinir, site başka sunucuya geri yüklenir) sonraki yayın sessizce yeni anahtar üretir. Kurulu yöneticilerin gizlisi açılmaz, kod girişleri 500 döner, sağlık ucu yeşil kalır (kart 0028'in bağımsız kontrolü, kod okuyarak, karar 0044). Yedek kod özetleri de aynı anahtara bağlıdır. Anahtar veritabanı yedeğine girmez, gizli bilgilerin yedeği de yoktur.

## Olmazsa olmazlar

- Önce ölçülür: anahtar değişince yayın, sağlık ucu ve giriş ne yapıyor.
- Veritabanında kurulu iki aşamalı giriş varken anahtar yeniden üretilmez, yayın durur ve sebebini söyler.
- `pnpm sunucu-denetle` eksik anahtarı yakalar.
- Anahtarın güvenli yedeği için yol kullanıcıya sorulur (ürün kararı değil, işletme kararı; önerisiyle).

## Sınırlar

- Anahtar yenileme aracı bu karta girmez.

## Bitti sayılır

- Anahtar silinince yayın duruyor, denetim kırmızı. Sunucuda ölçüldü.
- Bozuk ya da farklı anahtarla sağlık ve yayın sonucu kullanıcıdan önce görülüyor. Ölçüldü.

## Durum

yapılacak
