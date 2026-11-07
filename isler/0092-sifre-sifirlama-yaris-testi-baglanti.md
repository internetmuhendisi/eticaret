# 0092 · Şifre sıfırlama yarış testi yük altında bağlantı bulamıyor

## Amaç

`cekirdek/kapi/testler/sifre-sifirlama.test.ts` içindeki "müşteri: sıfırlamayla üst üste binen eski şifreli giriş açık oturum bırakmaz" testi, bütün test takımı yük altında çalışırken bir kez düştü: sıfırlama ucu 500 döndü, sebep "Connection terminated due to connection timeout" (veritabanı havuzu 5 saniyede bağlantı veremedi). Kodda bir hataya işaret etmiyor, ama kırmızı hat yayını durdurduğu için kontrol hattında boş yere düşebilir.

Kart 0071 sırasında ölçüldü (2026-11-07): makinenin yük ortalaması 25,7 iken takımın üç tam çalıştırmasından birinde düştü (o çalıştırmada 843 giriş denemesi aynı anda gitti). Test tek başına aynı yükte üç kez geçti, takım 17-18 yükte iki kez geçti.

## Olmazsa olmazlar

- Önce sebep ölçülür: testin açtığı eşzamanlı bağlantı sayısı, havuzun sınırı, aynı anda çalışan öteki veritabanı testleri.
- Testin denediği yarış zayıflamaz: sıfırlama ile eski şifreli giriş gerçekten üst üste biner.
- Çözüm testin kendisinde ya da test ayarındadır; uygulamanın bağlantı süresi bu iş için değişmez, değişecekse ayrı karar olur.

## Sınırlar

- Kart 0088 (sunucuda yönetici testinin süresi) ve kart 0067 (hat sıfırlama yarış testi) ayrı işlerdir; ortak bir sebep çıkarsa birlikte kapatılır.

## Bitti sayılır

- Test, takım yük altında çalışırken art arda beş kez geçiyor; ölçüm kartın kapanışında yazılı.

## Durum

yapılacak
