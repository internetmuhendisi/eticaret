# 0166 · Stok bildirimleri paneli testinde "Connection closed." konsol hatası

## Amaç

Kart 0145'in denemesinde bütün tarayıcı testleri bir kez çalıştırıldı (2026-11-13). `stok-bildirimi.test.ts` içindeki "panelde stok bildirimleri menüde ve sayfada bekleyen sayıyla görünür" testi konsolda tek bir `Connection closed.` hatasıyla düştü. Aynı çalışmada sunucu günlüğüne bir hidrasyon uyarısı da yazıldı. Testin dosyası tek başına üç kez çalıştırıldı, üçünde de geçti. Hata yük altında çıkıyor. Hatanın nereden geldiği ölçülmedi. Muhtemel kaynak, sayfa geçişi sürerken kesilen RSC akışı.

## Olmazsa olmazlar

- Hatayı yeniden üret: tam takımda ya da yavaşlatılmış işlemciyle.
- Kaynağını ölç: hangi istek, hangi geçiş.
- Kaynak testse testi düzelt. Kaynak uygulamaysa uygulamayı düzelt. Düzeltme öncesinde kırmızı, sonrasında yeşil olsun.
- Hidrasyon uyarısının aynı testten gelip gelmediğini ayrıca ölç.

## Sınırlar

- Konsol denetimi gevşetilmez. `Connection closed.` ölçülmeden `haric` listesine alınmaz.

## Bitti sayılır

- Hatanın kaynağı ölçümle yazıldı.
- Test yük altında art arda en az beş kez geçiyor.

## Durum

yapılacak
