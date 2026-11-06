# 0029 · Değişiklik kaydı: kim, ne zaman, neyi

## Amaç

Fiyat, stok, sipariş ve yetki değişikliklerinde kimin, ne zaman, neyi değiştirdiği kaydedilir (`.claude/rules/yetki.md`). Ortak kayıt yeri şimdi kurulur, ilk kullanıcısı yetki değişiklikleridir.

Önce 0026 bitmiş olmalı.

## Olmazsa olmazlar

- Tek bir değişiklik kaydı yeri. Her modül kaydı aynı yoldan yazar.
- Her kayıtta: kim, ne zaman, hangi kayıt, eski ve yeni değer.
- Kayıtlar sonradan değiştirilemez, panelden silinemez.
- Rol atama, rol kaldırma ve giriş hesabının kapatılması kaydedilir.
- Kayıtta şifre ve anahtar yoktur.
- Hesabı kapatan servis, tam yetkili son yöneticinin hesabını kapatmaz; `rolAl` bu kuralı rol alırken uygular, hesap kapatılırken kural henüz yoktur (karar 0040). Hesap kapatma `rolAl` ile aynı kilidi (tam yetkili rol satırları) alır; kilitsiz yazılırsa ikisi aynı anda geçer, sahip kalmaz.

## Sınırlar

- Fiyat, stok ve siparişin kayıtları o modüller yazılınca bu yeri kullanır.
- Panelde kayıt görüntüleme ekranı yapılmaz.

## Bitti sayılır

- Bir yöneticiye rol verilince kayıt doğru kişi, zaman ve değerle düşüyor. Test bunu gösteriyor.
- Var olan bir kaydı değiştirme denemesi veritabanında reddediliyor.

## Durum

bitti
