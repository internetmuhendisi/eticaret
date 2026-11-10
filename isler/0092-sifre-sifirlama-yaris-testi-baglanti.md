# 0092 · Şifre sıfırlama yarış testi yük altında bağlantı bulamıyor

## Amaç

`cekirdek/kapi/testler/sifre-sifirlama.test.ts` içindeki "müşteri: sıfırlamayla üst üste binen eski şifreli giriş açık oturum bırakmaz" testi, bütün test takımı yük altında çalışırken bir kez düştü: sıfırlama ucu 500 döndü, sebep "Connection terminated due to connection timeout" (veritabanı havuzu 5 saniyede bağlantı veremedi). Kodda bir hataya işaret etmiyor, ama kırmızı hat yayını durdurduğu için kontrol hattında boş yere düşebilir.

Kart 0071 sırasında ölçüldü (2026-11-07): makinenin yük ortalaması 25,7 iken takımın üç tam çalıştırmasından birinde düştü (o çalıştırmada 843 giriş denemesi aynı anda gitti). Test tek başına aynı yükte üç kez geçti, takım 17-18 yükte iki kez geçti.

## Ölçüm (2026-11-11)

- Kontrol hattında da düştü (çalışma 42918605493): 789 giriş isteği, sıfırlama ucu 500, "Connection terminated due to connection timeout".
- Teste geçici bir kayıt konup ölçüldü. Tek başına, yüksüz: yenileme 30–44 ms, turda 6–8 giriş isteği, havuzda bekleyen yok. Tek başına, 48 meşgul süreçle ya da 4 meşgul çekirdeğe sıkıştırılarak: yenileme 57–148 ms, 9–25 istek, yine bekleyen yok; düşmedi.
- Bütün birim takımı yük altında iki kez: birinde düştü. İlk turda yenileme 5116 ms sürdü, 881 istek gitti, havuzda en çok 12 istek bekledi, havuz 9 bağlantıdaydı (10 sınır). Ötekinde 15–30 istek, yenileme 124–248 ms.
- Neden: test yenileme sürdükçe her 5 ms'de bir yeni giriş isteği gönderiyordu, aynı anda kaç tane olduğuna bakmadan. Veritabanı öteki testlerle meşgulken yenileme biraz gecikince istek sayısı büyüyor, büyüyen yük yenilemeyi daha da geciktiriyordu; sonunda yenileme havuzdan 5 saniyede bağlantı alamadı. Kodda hata yok.
- Çözüm testte: giriş istekleri yenileme boyunca kesintisiz gider, aynı anda en çok 4 tane (havuzun 10 bağlantısından azı); biten isteğin yerine hemen yenisi gider. Yönetici testi de aynı kalıptaydı, o da değişti. Uygulamanın bağlantı süresi değişmedi.
- Yarışın hâlâ yakalandığı: `sifreDegismediyse` içindeki şifre denetimi kaldırılınca müşteri ve yönetici testleri üç denemenin üçünde de kırmızıya düştü.
- Düzeltmeden sonra bütün birim takımı yük altında (yük ortalaması 40,4–47,5) art arda beş kez çalıştı: iki yarış testi beşinde de geçti. Aynı çalışmalarda dört başka test 5 saniyelik sınırı aştı, kart 0133'e yazıldı.

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
