# 0338 · Fiyat yazıldığı milisaniyede okunursa eski fiyat görünmez

## Amaç

Kart 0326'nın testi ara sıra düştü, sebebi ölçüldü: fiyat geçmişinin zamanı veritabanında mikrosaniyeyle yazılır (`clock_timestamp()`), gösterimin anı uygulamadan milisaniyeye kesik gelir (`gosterilecekFiyatlar`, `an ?? new Date()`). Geçmiş `zaman <= an` ile süzülür (`cekirdek/moduller/fiyat/servis.ts`). Aynı milisaniyede yazılan satır (ör. an `00:30:26.725Z`, satır `00:30:26.725279`) dışarıda kalır. O milisaniye boyunca kayıtlı fiyat indirimli görünür, eski fiyat bulunamaz. Yerelde arka arkaya yazıp okuyan 150 denemenin 47–51'inde oldu.

Kart 0081'den beri böyle (karar 0067); kart 0081'in notunda "uygulama ile veritabanı arasındaki saat farkı ölçülmedi" yazar.

## Olmazsa olmazlar

- Geçmiş satırı ile gösterimin anı aynı ölçüyle karşılaştırılır (ör. süzgeç anın milisaniyesinin sonuna kadar, ya da an veritabanının saatinden). Kart 0081'in kuralları değişmez.
- Fiyat geçmişini anla süzen öteki sorgular da aranır (sayfalama, indirimin bitişi, ürün kaynakları).
- Gerçek veritabanıyla, yazıldığı milisaniyede okunan indirimli fiyatın eski fiyatı test edilir; düzeltme geri alınınca kırmızı.
- Kart 0326'nın testindeki bekleme (`giris-degisikligi.test.ts`, `gorunen`) kaldırılır.

## Sınırlar

- Uygulama ile veritabanı sunucusunun saat farkı (ayrı makineler) bu kartta değildir.

## Bitti sayılır

- Gerçek veritabanıyla test, düzeltme bozulunca kırmızı.
- Aynı süzgeci kullanan öteki yerler denetlendi.
- Bağımsız kontrol yapıldı.

## Durum

yapılacak
