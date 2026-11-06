# 0027 · Yönetici girişi ve deneme sınırı

## Amaç

Mağaza sahibi ve ekibi `/yonetim/giris` adresinden panele girer. Girmeyen kimse panelin hiçbir sayfasını göremez (`.claude/rules/guvenlik.md`).

Önce 0026 bitmiş olmalı.

## Olmazsa olmazlar

- Giriş sayfası. Altyapı adı burada ve alt köşede küçük görünür (karar 0004). Metinler metin dosyasında.
- Girişsiz panel adresi giriş sayfasına yönlenir, girişten sonra istenen sayfaya döner.
- Giriş deneme sınırı: hem hesap hem bağlantı başına. Sınır değerleri tek yerde.
- Yanlış girişte e-postanın kayıtlı olup olmadığı belli edilmez.
- İlk yönetici hesabını açan bir komut. Örnek Mağaza'ya deneme yöneticisi bununla açılır, şifresi kayda girmez.
- Giriş, çıkış ve başarısız denemeler günlüğe kısaltılmış e-postayla yazılır.
- Oturum `istektenOturumAl` ile yalnız çerez yazabilen yerde (uç, ara katman) okunur; sayfa çizerken okunursa oturum kapanır (karar 0039).

## Sınırlar

- İki aşamalı giriş 0028'dir.
- Panel tasarımı ve panel iskeleti bu işe girmez, sayfa ortak form parçalarıyla sade kurulur.

## Bitti sayılır

- Deneme yöneticisi giriş yapıp boş panele ulaşıyor, çıkış yapınca panele giremiyor. Tarayıcı testi bunu deniyor.
- Sınırı aşan denemeler bekletiliyor, test bunu gösteriyor.
- Giriş sayfası telefonda, tablette ve bilgisayarda kullanılabiliyor, klavyeyle doldurulabiliyor.

## Durum

yapılacak
