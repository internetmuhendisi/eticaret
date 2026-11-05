# 0018 · Sunucunun kurulması

## Amaç

Bütün sitelerin çalışacağı ilk sunucu Hetzner'de, Almanya'da açılır ve güvenli hâle getirilir (kararlar 0009, 0013).

Önce 0016 bitmiş olmalı.

## Olmazsa olmazlar

- Kullanıcıdan: Hetzner hesabı ve ödeme bilgisi. Sunucu aylık ücretlidir, açmadan önce boyutu ve fiyatı kullanıcıya söylenir, onayı alınır.
- Almanya'daki bir veri merkezinde sunucu. Boyut başlangıç tahminine göre seçilir (site başına yarım GB bellek).
- Yalnız anahtarla giriş, şifreyle giriş ve kök kullanıcıyla giriş kapalı.
- Güvenlik duvarı: yalnız gereken kapılar açık.
- Docker kurulu, güvenlik güncellemeleri kendiliğinden geliyor.
- Kurulum adımları tekrar edilebilir biçimde `sunucu/` altına yazılır.

## Sınırlar

- Alan adı, site yayını ve yedek bu işe girmez.

## Bitti sayılır

- Sunucu Almanya'da çalışıyor, adresi ve veri merkezi kayda yazıldı (gizli bilgi olmadan).
- Şifreyle giriş denemesi reddediliyor.
- Dışarıdan bakınca yalnız gereken kapılar açık.
- Docker sunucuda çalışıyor.

## Durum

bitti
