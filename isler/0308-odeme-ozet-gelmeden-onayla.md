# 0308 · Ödemede özet gelmeden basılan "Siparişi onayla" boşa gidiyor

## Amaç

Hattın 45644376937 numaralı çalışmasında (kartlar 0287 ve 0288, kayıt afa43c0) yalnız bir test düştü: `cekirdek/testler/uctan-uca/odeme.test.ts:447` "boş gönderimde hatalar özetlenir…". Test sayfa bağlanınca "Siparişi onayla"ya Enter ile bastı. O anda sayfanın sepet özeti (`POST /kapi/herkese-acik/sepet`), hesap durumu ve robot sorusu istekleri henüz dönmemişti; her biri tarayıcıda ~1,6 saniye sürdü. Sunucu bu istekleri tarayıcının gönderdiği andan ~1,2 saniye sonra aldı ve 7–107 ms'de yanıtladı. Aynı anda öteki işçinin `/gelistirme/bilesenler/bolum-kutuphanesi` sayfası 1,7–1,9 saniye uygulama kodu çalıştırıyordu (derleme değil, `next.js` payı 20–37 ms). Form özet hazır değilken ya da hesap durumu bilinmezken gönderimi sessizce yok sayar (`cekirdek/vitrin/odeme/odeme-formu.tsx:554`, `durum.tur !== "hazir" || bilinmiyor`), düğme ise etkin görünür (`disabled={bekliyor}`). Hata özeti hiç çıkmadı, test 5 saniyede düştü. Önceki hatlarda aynı test geçiyordu; düşüş zamanlamaya bağlıdır.

Bu bir test yarışı olduğu kadar müşterinin de yaşayabileceği bir durumdur: yavaş bağlantıda özet gelmeden basan müşterinin basışı hiçbir şey söylemeden kaybolur.

Kart 0288'in hattına bakılırken bulundu, o karta karıştırılmadı.

## Olmazsa olmazlar

- Özet ya da hesap durumu gelmeden basılan "Siparişi onayla" için davranış seçilir (ör. düğme beklerken yükleniyor gösterir ve basış özet gelince işlenir, ya da düğme o sırada `aria-disabled` olur ve nedeni duyurulur). Müşterinin göreceği davranış olduğu için kullanıcıya sorulur.
- Testin ödeme sayfasını açan yardımcısı (`odemeyiAc`) formun gerçekten gönderilebilir olmasını bekler; bunu gösteren bir koşul ölçülür (ör. özetin toplamı görünür).
- Sunucunun bir sayfanın çizimi sırasında öteki istekleri ~1,2 saniye bekletmesi kart 0251'in ailesiyle birlikte not edilir (o kartta Turbopack önbellek yazımı sırasında 18 saniyelik durma ölçüldü).

## Sınırlar

- Ödemenin kendisi (kart 0213, 0214) ve formun doğrulama kuralları değişmez.

## Bitti sayılır

- Seçilen davranış uygulandı; özet gelmeden basışı geciktirilmiş özet isteğiyle (ör. isteği test tutarak) deneyen bir tarayıcı testi var ve eski davranışta kırmızı.
- `odeme.test.ts` hattın koşulunda art arda beş kez geçiyor.
- Bağımsız kontrol yapıldı.

## Notlar

- 2026-11-25, kullanıcı kararı (b): özet gelene kadar düğme basılamaz ve nedenini yazar (karar 0183). Düğme `aria-disabled` (odak alır, ekran okuyucu nedeni düğmeyle okur; sepetteki "Ödemeye geç" ile aynı kalıp), neden `vitrin.odeme.onayBekliyor`; özet alınamazsa `vitrin.odeme.sepetHata`. Gönderim işlevi aynı koşulla gönderimi yapmaz.
- Test `odeme.test.ts` "özet gelene kadar…": sepet özeti isteği test bırakana kadar tutulur; düğmenin kapalılığı, bağlı ve görünür neden, odak, Enter'da hata özeti ve ödeme isteği olmaması, özet beklenirken iki renkte ve üç genişlikte tarama, bırakınca açılma ve neden metninin kalkması, özet isteği düşürülünce sepetin hata metni. Tutulan istek ağı boşaltmadığı için bu test `sayfaHazir` yerine formun `aria-busy="false"` olmasını bekler. Playwright `aria-disabled` düğmeyi etkin saymaz (`toBeEnabled` bunu da bekler).
- Eski form, nedenin düğmeye bağlanmaması ve hata durumunda bekleme metni ayrı ayrı bilerek bozuldu; üçünde de yeni test kırmızıya düştü.
- `odemeyiAc` ve kartla ödeme testinin onay adımı basmadan önce düğmenin açılmasını bekler.
- Hattın koşulunda (ayrı kutuda temiz veritabanı, iki işlemci, iki işçi): `odeme.test.ts` art arda beş ayrı turda 10/10; `odeme.test.ts` ile `kartla-odeme.test.ts` birlikte bir kez 13/13 (yeni testin ilk yazılışı hariç). İlk ölçüm `--repeat-each=5` ile yapılmıştı ve 50'de 3 düştü: tekrarlar iki işçiye dağıldı, aynı dosya kendisiyle aynı anda çalıştı (site ayarı ve aynı birimin stoğu); hatta bu olmaz.
- Sunucunun bir sayfayı çizerken öteki istekleri bekletmesi (hat 45644376937'de `/gelistirme/bilesenler/bolum-kutuphanesi` 1,7–1,9 sn uygulama kodu, öteki istekler ~1,2 sn sonra alındı) kart 0251'in ailesine not olarak bırakıldı; 0251 kullanıcı kararıyla bekletiliyor, karta yazılmadı.

## Durum

yapılacak
