# 0043 · Hata izleme bağlantısı sürecin ortak alanında

## Tarih

2026-11-06

## Karar

- Hata izleme aracının sunucudaki bağlantısı `cekirdek/izleme/hata-katmani.ts` dosyasının içinde değil, sürecin ortak alanında (`globalThis`, `Symbol.for("cekirdek.hataIzlemeAraci")`) durur. Açılışta bağlanan aracı uçlar ve ara katman da görür.
- `pnpm hata-izleme-denemesi` gerçek uçtan ve ara katmandan çıkan hatayı da ölçer. Ortamın veritabanı kutusunu kısa süre durdurur, çalışan uygulamaya kutunun içinden giriş ucu, sağlık ucu ve panel adresi isteği atar, veritabanını açar. Araçtaki kaydı işaretle değil, veritabanının tam kapalı olduğu aralıkta gelmiş olmasıyla ve bağlamıyla bulur. Her isteğin yanıt kodu da beklenenle karşılaştırılır.
- Veritabanı kapatıldıktan sonra hatada ve kesme sinyallerinde (Ctrl-C, terminalin kapanması) de açılır. Açmadan önce sürmekte olabilecek durdurmanın bitmesi beklenir, açıldıktan sonra kutunun çalıştığı okunur, beş kez denenir. Açılamazsa komut bunu ve elle açma komutunu söyler.
- Olayın içeriği ve maskesi değişmez (0036).

## Neden

- Ölçüldü: geçerli gönderim adresi ve kapalı veritabanıyla sağlık ucu, giriş ucu ve panel adresi günlüğe birer "beklenmeyen hata" yazdı, araca 0 olay gitti. `hata-katmani.ts` süreçte üç kopya yükleniyordu: açılış, uçlar, ara katman. Araç yalnız açılışın kopyasına bağlanıyordu. Bağlantı ortak alana alınınca aynı ölçümde her istek araca birer etiketli olay gönderdi.
- Sorun kart 0027'den önce de vardı: çekirdek 0.5.1'de ve sunucudaki 0.3.0'da sağlık ucu aynı sonucu verdi. Eski deneme ayrı süreçte kendi bağlantısını kurduğu için bunu göremiyordu.
- İstekler kutunun içinden gider: veritabanı durunca ön kapı bakım sayfasına geçer (0038) ve isteği uygulamaya ulaştırmayabilir.
- Gerçek uç hatası denemenin işaretini taşıyamaz: hatanın içeriğini uygulama yazar. Bu yüzden kayıt zamandan ve bağlamdan bulunur.

## Düşünülen diğer yollar

- Her paketin aracı kendisi bağlaması (ilk hatada bağlanma): Seçilmedi. Karar 0026'daki ortak alan yöntemi projede zaten var, kopya başına bir bağlantı da gereksiz durum üretirdi.
- Denemeye ayrı bir "hata çıkaran uç" eklemek: Seçilmedi. Hata çıkaran bir adres saldırı yüzeyidir ve çekirdeğe yalnız deneme için kod girerdi. Veritabanını durdurmak gerçek hatayı gerçek yoldan çıkarır.
- Ölçümü yalnız yerelde yapmak: Seçilmedi. Ön kapıyı, gerçek aracı ve görüntüdeki derlemeyi kapsamaz.

## Sonuçları

- Bu kayıttan önceki sürümlerde uç ve ara katman hataları araca hiç ulaşmıyordu; o döneme ait araçtaki boşluk hatasızlık anlamına gelmez.
- `pnpm hata-izleme-denemesi` artık ortamın veritabanını kısa süre durdurur. O ortamdaki bütün siteler bu sürede bakım sayfasına düşebilir. Yalnız deneme ortamında çalışır; canlı ortam açılınca ayrıca düşünülmelidir.
- Süreç zorla öldürülür (SIGKILL, bilgisayarın kapanması) ya da sunucuya ulaşılamazsa veritabanı kapalı kalabilir: elle durdurulan kutu kendiliğinden açılmaz. Bunu `pnpm sunucu-denetle` çalıştırılınca görür.
- Sağlık ucu ölçümü kendi isteğini ayırmaz: ön kapının yoklaması da aynı kaydı üretir. İkisi de uygulamanın aynı yolundan geçtiği için bağlantı bozukken yanlış yeşil vermez.
- Deneme yayın kilidini almaz (`pnpm bakim-denemesi` gibi). Yayın ya da gece yedeği sırasında çalıştırılırsa onlar da veritabanını kapalı bulur; yalnız disiplindir.
- Maske sınaması sınırlıdır: şifre ve oturum anahtarı veritabanı hatasına hiç girmez. Gerçek sınama e-postadır. Şifre, kart ve telefonun maskesini ilk ölçüm sınar.
- Gerçek bir veritabanı kesintisinde artık her sağlık yoklaması araca bir olay gönderir (ön kapı 5 saniyede bir yoklar, sunucuda olay sınırı yoktur). Bu sıklık kart 0050'dedir.
- Denemenin okuduğu sorunların olayları biriktikçe okuma yavaşlar; sonucu değiştirmez.
- Her deneme araçta gerçek veritabanı hatası kayıtları bırakır. Bunlar işaret taşımaz, deneme sırasındaki zamanlarıyla ayırt edilir.
- Ölçüm kontrol hattında değil, sunucuya bağlanır. Hatta çalışan koruma, dosyanın ikinci kopyasının aracı gördüğünü denetleyen birim testidir (`cekirdek/izleme/testler/gunluk.test.ts`). Açılıştaki bağlama satırının kaldırılması gibi başka bir bozulmayı yalnız deneme görür.
- Aynı ölçümde istek sayacının ve giriş deneme sayacının ölçülen uçlarda tek kopya yüklendiği görüldü. Veritabanı havuzu iki kopyadır (0042). Uçlar başka bir pakete bölünürse sayaçlar da bölünür; bunun otomatik kontrolü yoktur.
