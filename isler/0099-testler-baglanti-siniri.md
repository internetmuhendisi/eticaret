# 0099 · Test takımı yerel veritabanının bağlantı sınırına dayanıyor

## Amaç

Bütün birim testleri birlikte çalışırken yerel veritabanının bağlantı sayısı sınırına (100) dayanıyor. Bir çalıştırmada `cekirdek/arka-plan-isleri/testler/kuyruk.test.ts` içindeki iki test "sorry, too many clients already" hatasıyla düştü. Kodda bir hataya işaret etmiyor, ama kırmızı hat yayını durdurduğu için kontrol hattında boş yere düşebilir. Testler eklendikçe sorun büyür.

Kart 0085 sırasında ölçüldü (2026-11-08): `pnpm birim-testleri` çalışırken `pg_stat_activity` 0,3 saniyede bir sayıldı.

| Çalıştırma | En yüksek bağlantı | Sonuç |
|---|---|---|
| Ana dal (0.27.0, 1707 test), iki kez | 101 ve 103 | Yeşil |
| Kart 0085 dalı (1743 test), iki kez | 103 ve 102 | Yeşil |

Kuyruk testi dosyası tek başına üç kez geçti.

## Olmazsa olmazlar

- Önce sebep ölçülür: hangi test dosyaları aynı anda kaç bağlantı açıyor? Her deneme sitesinin havuzu, yönetici bağlantıları ve aynı anda çalışan dosya sayısı ayrı ayrı sayılır.
- Çözüm test ayarındadır: havuz boyutu, aynı anda çalışan dosya sayısı ya da yerel veritabanının sınırı. Uygulamanın kendi havuzu bu iş için değişmez; değişecekse ayrı karar olur.
- Hiçbir yarış testi zayıflamaz.
- Kontrol hattının veritabanı da aynı ölçümle denenir.

## Sınırlar

- Kart 0092 (şifre sıfırlama yarış testinde bağlantı bekleme süresi) ve kart 0096 (yük altında panelden çıkış testi) ayrı işlerdir. Ortak bir sebep çıkarsa birlikte kapatılır.

## Bitti sayılır

- Tam takımın en yüksek bağlantı sayısı sınırın belirgin altında; ölçüm kartın kapanışında yazılı.
- Takım art arda beş kez yeşil geçiyor.

## Durum

yapılacak
