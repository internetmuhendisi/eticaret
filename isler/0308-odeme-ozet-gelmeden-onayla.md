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

## Durum

yapılacak
