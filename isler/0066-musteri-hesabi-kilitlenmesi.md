# 0066 · Başkası müşteriyi girişten kilitlemesin

## Amaç

Kart 0033 müşteri girişinde yöneticinin deneme sınırını kullanıyor: hesap başına 15 dakikada 10 yanlış deneme, sonra 15 dakika bekleme (karar 0042, 0051). E-postayı bilen biri bilerek yanlış deneyip müşteriyi doğru şifreyle de dışarıda bırakabilir ve bunu sürdürebilir. Bağımsız kontrolde kod okumasıyla görüldü, uzun süreli çalıştırılmadı.

## Olmazsa olmazlar

- Kullanıcı kararı (2026-11-07): Kilitlenen müşteriye e-postayla giriş yolu verilir. İlk gerçek mağazadan önce yapılır, Örnek Mağaza o zamana kadar bugünkü sınırla kalır. Önce 0034 ve 0060 bitmiş olmalı: yol gerçek e-postaya dayanır.
- Şifre kırmayı kolaylaştıran bir yol açılmaz.
- Kullanıcının kararı site başına değişebilecekse site ayarı olarak önerilir.

## Sınırlar

- Yönetici girişinin sınırı bu işte değişmez.

## Bitti sayılır

- Karar kaydı yazılı, seçilen davranış testle gösteriliyor.

## Durum

yapılacak
