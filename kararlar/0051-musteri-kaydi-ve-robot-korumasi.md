# 0051 · Müşteri kaydı: kayıtlı e-posta söylenir, robot koruması kendi sunucumuzda, onaylar değiştirilemez

## Tarih

2026-11-07

## Karar

- **Kayıtlı e-posta (kullanıcı kararı):** Kayıt "bu e-posta kayıtlı" der, giriş sayfasına bağlantı verir. Uç `cakisma` döner.
- **E-posta doğrulaması (kullanıcı kararı):** Site ayarı olarak önerildi, altyapı sahibinindir. Varsayılan ve Örnek Mağaza değeri kapalıdır. Bu kartta yalnız `planlar/site-ayarlari.md` dosyasına yazıldı, şemada yoktur. "Açık" davranışı kart 0062'dedir: orada kayıttan sonra oturum açılmaz, herkes aynı cevabı alır, kayıtlı e-posta belli olmaz.
- **Yasal metinler (kullanıcı kararı):** `/yasal/uyelik-sozlesmesi` ve `/yasal/kvkk-aydinlatma` taslak olduğunu söyleyen yer tutucudur. Hukuki metin yazılmadı. Gerçek metinler kart 0063'tedir.
- **Robot koruması:** ALTCHA kütüphanesi (`altcha-lib` 2.8.0, MIT lisanslı, başka pakete bağımlı değil), PBKDF2 yöntemiyle. Doğrulama kendi sunucumuzdadır, dış hizmete istek gitmez, veri Almanya'dan çıkmaz. Sunucu imzalı soru verir, tarayıcı form açılınca arkada çözer, müşteri bulmaca görmez. Kod yalnız `cekirdek/moduller/robot-korumasi/` modülünü bilir, değerler `cekirdek/kayitlar/robot-korumasi.ts` dosyasındadır. Her cevap bir kez geçer. Reddedilirse form yeni soruyla bir kez daha dener. Hata kodu `robot-dogrulamasi` (403).
- **Anahtar süreçte üretilir:** Robot sorusunun imza anahtarları süreç açılırken rastgele üretilir, gizli bilgi kaydına girmez.
- **Onay kaydı:** `musteri_onaylari` her onay için türü, verilip verilmediğini, metin sürümünü ve zamanı tutar. Pazarlama kutusu işaretsiz bırakılırsa "verilmedi" satırı yazılır. Satırlar veritabanındaki tetikleyiciyle değiştirilemez ve silinemez. Sürümler `cekirdek/kayitlar/musteri-onaylari.ts` dosyasındadır. Bağlantı adresi tutulmaz.
- **Tek işlem:** Hesap, onaylar, hoş geldin e-postası ve oturum aynı veritabanı işlemindedir.
- **Oturumu sorma:** Vitrin `GET /kapi/musteri/hesabim` ucuyla sorar (karar 0039). Müşterinin iki aşamalı girişi yoktur; `oturumAc` yalnız `moduller/musteri/servis.ts` içinden `musteri` türüyle de çağrılabilir, bunu `iki-asamali-giris.test.ts` denetler.
- **Giriş sınırı:** Yöneticiyle aynıdır (`sinirliSifreDogrula`, karar 0042). Kayıt ve giriş ucu `siki` istek sınırındadır.

## Neden

- **Kayıtlı e-postayı söylemek:** Gizlemek ancak kayıttan sonra oturum açılmazsa mümkündür; yoksa oturumun açılıp açılmaması da aynı bilgiyi verir. Doğrulama kapalıyken müşteriye en açık yol budur. Robot cevabı veritabanından önce denetlendiği için toplu tarama her adres için ayrı iş ve istek ister.
- **Doğrulama kapalı:** Sunucuda gerçek e-posta kart 0060'a kadar gitmez, açık olsa orada kimse kaydı bitiremez.
- **Kendi sunucumuzda:** Temel kural verinin Almanya'da kalmasıdır (karar 0009). Dış hizmet çerez, hesap ve anahtar getirirdi.
- **Süreçte üretilen anahtar:** Soru en çok 10 dakika yaşar, kalıcı anahtar gerektirmez. Sızacak, taşınacak ya da devirde yenilenecek bir şey yoktur (karar 0014). Kutu yeniden başlayınca yarım kalan form sessizce yeni soru alır.
- **Sürecin ortak alanı:** Next.js adres dosyalarını ayrı paketleyebilir; soruyu üreten uç ile cevabı alan uç aynı anahtarı görmeli (`Symbol.for`).
- **"Verilmedi" satırı:** Boşluk "sorulmadı" da demek olabilirdi. Satır, kutunun işaretsiz bırakıldığını gösterir.

## Düşünülen diğer yollar

- **Cloudflare Turnstile, hCaptcha, reCAPTCHA:** Seçilmedi. Veri ABD bağlantılı hizmete gider, üçüncü taraf kod ve çerez getirir.
- **Friendly Captcha:** Seçilmedi. Almanya'dadır ama ücretli hesap ve anahtar ister; bugünkü ihtiyaç buna değmez.
- **ALTCHA'nın hazır ekran parçası:** Seçilmedi. Görünen bir kutu, kendi metinleri ve bir paket daha getirir. Görünmez çözüm müşteriye iş bırakmaz.
- **Kalıcı gizli anahtar:** Seçilmedi. Gerekçesi yukarıda.
- **Her zaman aynı cevap:** Seçilmedi (kullanıcı kararı). Doğrulamasız çalışmaz, kart 0062 ile gelir.
- **Bağlantı adresini onayla saklamak:** Seçilmedi. Kişisel veriyi az tutmak için. Hukukçu kanıt olarak isterse yeni alan eklenir (kart 0063).
- **`oturumAcikMi` ile sayfada sormak:** Seçilmedi. Kart ve karar 0039 oturumun uçta okunmasını istiyor; ayrıca müşterinin kısa anahtarı burada yenilenir.

## Sonuçları

- **Robot koruması kararlı saldırganı durdurmaz:** Bir cevap güncel bir bilgisayarda bir saniyenin altında çözülür. Otomatik kayıtları yavaşlatır, istek sınırıyla birlikte çalışır. Bağlantı başına dakikada 5 kayıt denemesi geçer; birçok adres kullanan saldırganı sınır durdurmaz. Gerekirse değerler `robotKorumasiAyari` içinde artırılır.
- **Süre ölçümü sınırlıdır:** Chromium'da işlemci 6 kat yavaşlatılarak bir kez ölçüldü: formu doldurup ana sayfaya geçmek 0,5–0,8 saniye sürdü. Bu kısıtlama tarayıcının şifreleme işlerini aynı oranda yavaşlatmayabilir. Gerçek telefonda denenmedi.
- **Başkasının adresiyle hesap açılabilir:** Doğrulama kapalıyken o adrese hoş geldin e-postası gider ve hesabın pazarlama izni de o adres için kaydedilir. Bu izinle toplu e-posta gönderilmeden çözülmeli (kart 0064).
- **E-posta kayıtlı mı öğrenilebilir:** Tek tek deneyen biri bir adresin bu mağazada üye olduğunu öğrenebilir. Hassas ürün satan bir mağazada bu daha önemlidir; o mağazada kart 0062 yapılmadan kayıt açılmamalıdır.
- **Yer tutucu metinler yalnız demo içindir:** Gerçek mağaza kart 0063 bitmeden açılmamalıdır. Bunu engelleyen bir kontrol yoktur, yalnız disiplindir. KVKK aydınlatmasının onay kutusuyla alınıp alınmayacağı hukukçuya sorulacak; kart bugün zorunlu kutu istiyor.
- **Onaylar hesabın kalıcı silinmesini engeller:** Onay satırı hesaba veritabanı bağıyla bağlıdır ve silinemez. Hesap silme işi bugün yalnız işaretlemedir. Kalıcı silme gelince saklama süresi ve onay satırları birlikte karara bağlanmalı.
- **Hoş geldin e-postası sunucuda gitmez:** Kart 0060'a kadar kayıt `gonderilmedi` olur ve hata izleme aracına kayıt başına bir olay düşer (karar 0050). Ulaşma yerel posta kutusunda ölçüldü: kartın "deneme sitesinde ulaşıyor" maddesi kullanıcı onayıyla böyle kapandı. Gerçek adrese ulaşma ölçülmedi.
- **Her girişsiz ziyarette bir istek ve 401:** Ana sayfa her açılışta `hesabim` ucunu sorar. Çerez yoksa veritabanına gidilmez ama tarayıcı konsolunda 401 görünür. Ekran ölçümü kontrolü kurulunca bu satırın istisna yazılması ya da uca dönülmesi gerekir.
- **Girişli müşteri giriş sayfasını görebilir:** Adresi elle açarsa form görünür, ana sayfaya yönlendirilmez. Vitrin tasarımı işinde ele alınmalı.
- **Oturum her istekte okunmaz:** Vitrinde ara katman yoktur; hesap sayfaları gelince (siparişlerim gibi) panelinki gibi bir kapı gerekebilir.
- **Süreç yeniden başlayınca kullanılmış cevap listesi silinir:** Anahtar da değiştiği için eski cevaplar zaten geçmez, açık yoktur.
- **Birden çok süreç çalıştırılırsa bu düzen çalışmaz:** Soru bir süreçte üretilip başka süreçte denetlenirse reddedilir. Bugün her site tek süreçtedir (karar 0042); bu değişirse anahtar gizli bilgiye, liste veritabanına taşınır.
- **Kütüphane yeni ve sık sürüm çıkarıyor:** 2.8.0 2026-10-24 tarihlidir. Sürüm kilitlidir, açıkları `pnpm guvenlik-taramasi` tarar. Bağımsız güvenlik denetimi olup olmadığına bakılmadı.
- **Kontrast ve otomatik erişilebilirlik taraması yoktur:** Ekran ölçümü kontrolü kurulmadı. Klavye, üç genişlik ve dokunma alanı tarayıcı testinde ölçüldü, açık tema dışı denenmedi: vitrin bugün yalnız açık temadadır.
