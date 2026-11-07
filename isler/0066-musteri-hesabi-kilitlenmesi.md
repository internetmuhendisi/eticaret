# 0066 · Başkası müşteriyi girişten kilitlemesin

## Amaç

Kart 0033 müşteri girişinde yöneticinin deneme sınırını kullanıyor: hesap başına 15 dakikada 10 yanlış deneme, sonra 15 dakika bekleme (karar 0042, 0051). E-postayı bilen biri bilerek yanlış deneyip müşteriyi doğru şifreyle de dışarıda bırakabilir ve bunu sürdürebilir. Bağımsız kontrolde kod okumasıyla görüldü, uzun süreli çalıştırılmadı.

## Olmazsa olmazlar

- Kullanıcıya ürün kararı olarak sorulur: kabul mü edilir, yoksa kilitlenen müşteriye çıkış yolu mu sunulur (e-postayla tek kullanımlık giriş bağlantısı, şifremi unuttum gibi).
- Şifre kırmayı kolaylaştıran bir yol açılmaz.
- Kullanıcının kararı site başına değişebilecekse site ayarı olarak önerilir.

## Sınırlar

- Yönetici girişinin sınırı bu işte değişmez.

## Bitti sayılır

- Karar kaydı yazılı, seçilen davranış testle gösteriliyor.

## Durum

yapılacak
