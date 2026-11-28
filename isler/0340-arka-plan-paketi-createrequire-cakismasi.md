# 0340 · Arka plan süreci açılmıyor: paketteki createRequire çakışması

## Amaç

Hat 46092515856 (94e4c196, 0.81.0) yalnız yerel ortam denemesinde kırmızı: Örnek Mağaza'nın arka plan kutusu sağlıksız, ortam açılamadı. Sebep yerelde ölçüldü: arka plan süreci Dockerfile'daki komutla paketlenip çalıştırılınca modül yüklenirken `SyntaxError: Identifier 'createRequire' has already been declared` ile düşer, nabız hiç yazılmaz. Paketin başına eklenen satır (`--banner:js="import { createRequire } from 'node:module'; …"`, `sunucu/cekirdek/Dockerfile`) ile pakete gömülen `fflate`'in (kart 0315, Excel eklentisi, `cekirdek/eklentiler/excel-ile-toplu-urun-islemleri/dosya.ts`) kendi `import { createRequire } from "module"` satırı aynı adı taşır. Kart 0087'deki sharp sorunuyla aynı sınıftan.

Kart 0315'ten beri her hat tarayıcı testlerinde düştüğü için (kart 0339) yerel ortam denemesine gelmemişti. 0.81.0 bu hâliyle yayınlansaydı canlıda arka plan süreci (e-posta, havale iptali, bildirimler, açılış kurulumu) çalışmazdı. Kart 0319'un yayınının önünde.

## Olmazsa olmazlar

- Paketin başına eklenen satır, gömülen paketlerin içe aktardığı adlarla çakışmayacak biçimde yazılır (ör. takma adla içe aktarma); tek tek paket dışarıda bırakılarak değil.
- Arka plan paketlerinin (süreç ve deneme) Dockerfile'daki komutla kurulup Node'un sözdizimi denetiminden geçtiğini ölçen birim testi; komutun bayrakları Dockerfile'dan okunur (iki yerde yazılmaz). Eski satırla kırmızı.
- Aynı satırı kullanan öteki paketler (sunucuda yönetici, veritabanı güncellemesi) aynı denetimden geçer.

## Sınırlar

- Excel eklentisinin davranışı değişmez.

## Bitti sayılır

- Birim testi eski satırla kırmızı, düzeltmeyle yeşil.
- Paketlenen süreç ulaşılamaz veritabanıyla açılıp nabız yazıyor (yerelde ölçüm).
- Gönderimin hattında yerel ortam denemesi yeşil.

## Sonuç

- Dockerfile'daki üç paket satırı createRequire'ı takma adla alır (`createRequire as __requireKur`). Yalnız arka plan paketi bozuktu (fflate yalnız orada gömülü); öteki iki satır aynı sınıfı önlemek için değişti.
- `komutlar/testler/goruntu-paketleri.test.ts`: Dockerfile'daki beş esbuild komutu dosyadan okunur, aynen kurulur, `node --check`'ten geçer. Eski satırla arka plan paketi kırmızı, düzeltmeyle 6/6.
- Görüntünün Node'uyla (24.22.1, ağsız kutu, ulaşılamaz veritabanı) eski paket sözdizimi hatasıyla açılmadı, nabız yazılmadı; yeni paket açıldı, "arka plan kuyruğu başladı" yazdı, nabız 2 sn tazeydi.

## Durum

yapılacak
