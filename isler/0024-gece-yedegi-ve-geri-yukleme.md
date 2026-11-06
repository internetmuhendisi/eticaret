# 0024 · Gece yedeği ve geri yükleme provası

## Amaç

Her sitenin veritabanı her gece ayrı yedeklenir ve tek başına geri yüklenebilir. Yedekler canlı sunucudan farklı bir Alman veri merkezinde durur (karar 0009, `.claude/rules/cok-siteli-yapi.md`).

Önce 0023 bitmiş olmalı.

## Olmazsa olmazlar

- Kullanıcıdan: yedek deposu ücretliyse onayı.
- Yedek deposu sunucudan farklı bir Alman veri merkezinde. Veri merkezi kurulumda doğrulanır (karar 0013 açık konusu).
- Site başına ayrı, şifrelenmiş gece yedeği. Saklama süresi yazılır.
- Tek bir siteyi öteki sitelere dokunmadan geri yükleyen komut.
- Her yedeğin sonucu kayda yazılır.
- `sunucu/yedek/` altında yedek dosyaları.
- Gizli bilgiler yedeğe girmez (karar 0031). Geri yüklemede sitenin veritabanı şifresi `pnpm sunucu-gizli --yenile` ile yeniden üretilip veritabanına da yazılır.

## Sınırlar

- Görsel deposunun yedeği görseller gelince eklenir.
- Düzenli geri yükleme provasının zamanlanması zamanlanmış kontrollerle gelir.

## Bitti sayılır

- Örnek Mağaza'nın ilk yedeği alındı ve depoda duruyor.
- Yedek ayrı bir veritabanına geri yüklendi ve içeriği karşılaştırıldı.
- Deponun veri merkezi canlı sunucununkinden farklı ve Almanya'da.

## Durum

bitti
