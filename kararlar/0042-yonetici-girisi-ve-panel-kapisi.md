# 0042 · Yönetici girişi: iki katmanlı panel kapısı, bellekte deneme sınırı

## Tarih

2026-11-06

## Karar

- **Uçlar:** `POST /kapi/herkese-acik/yonetici-giris` ve `yonetici-cikis`. Giriş yapmamış kişi izin taşıyamayacağı için ikisi de herkese açık giriştedir; sahte istek kontrolü ikisinde de çalışır.
- **Panel kapısı:** Next.js'in ara katmanı (`cekirdek/uygulama/proxy.ts`) her `/yonetim` isteğinde oturumu okur, anahtarı gerekirse yeniler, girişsiz isteği giriş sayfasına yönlendirir. `(panel)` düzeni `oturumAcikMi` ile anahtarı değiştirmeden ikinci kez sorar. Veritabanına ulaşılamazsa panel açılmaz (503).
- **Dönüş adresi:** `?donus=` yalnız `/yonetim` altındaki adresleri kabul eder (`guvenliDonus`).
- **Deneme sınırı:** Hesap başına 15 dakikada 10, bağlantı başına 15 dakikada 20 yanlış denemeden sonra giriş, son denemeden itibaren 15 dakika bekletilir (kullanıcı onayı). Değerler site ayarı değildir, bütün sitelerde aynıdır (`cekirdek/kayitlar/oturum.ts`). Kapının `siki` istek sınırı bunun önünde ayrıca çalışır. Sayaç bellektedir, deneme şifreye bakmadan önce ayrılır.
- **Yeni hata kodu:** Yanlış e-posta ya da şifre `giris-hatasi` (401) alır. Geçerli oturumu olmayan `oturum-yok` ile karışmasın diye ayrıdır.
- **İlk yönetici:** `pnpm yonetici-ac siteler/<kod-adi> <eposta>` tam yetkili rolle hesap açar, şifreyi üretip ekranda bir kez gösterir. Yalnız yerelde çalışır, sunucu tarafı kart 0048'dedir (kullanıcı onayı).
- **Bileşenler:** Kütüphane boştu. Yalnız gereken dört parça yazıldı (`bilesenler/form/`). Tasarım değerleri olmadığı için renkler tarayıcının sistem renkleridir.
- **Altyapı adı:** Tek tanımı `cekirdek/kayitlar/altyapi.ts`, şimdilik "eticaret" (kullanıcı onayı). Panelin dış düzeninde alt köşede küçük durur, giriş sayfası da bu düzendedir (karar 0004).

## Neden

- Oturum çerez yazabilen yerde okunmalıdır (karar 0039), sayfa çizimi çerez yazamaz. Ara katman bunun doğal yeridir. Next.js'in belgesi ara katmanın adres eşleşmesine tek başına güvenilmemesini söylüyor, bu yüzden düzen ikinci kez sorar.
- Düzenin sorusu anahtarı değiştirmez ve az önce değişmiş anahtarı tolerans süresince kabul eder. Yoksa ara katmanın anahtarı yenilediği istekte sayfa eski çerezi görür, kullanıcı panelden atılırdı.
- Deneme şifreye bakmadan önce ayrılır: Argon2 yaklaşık 50 ms sürer, aynı anda giden istekler sayılmadan önce sınırı aşardı. Aynı anda giden denemelerle ölçüldü.
- Hesap sayacı kayıtlı olmayan e-postada da çalışır: yoksa sınırın gelip gelmemesi e-postanın kayıtlı olduğunu belli ederdi.
- Bu bekleme şifre kırmayı pratikte imkânsız kılar: `siki` sınırla bağlantı başına dakikada 5, hesap başına 15 dakikada en çok 10 deneme. Pencere sabit olduğu için iki pencerenin birleştiği yerde kısa sürede 19 deneme sığabilir (ölçüldü); sonrasında 15 dakika beklenir.

## Düşünülen diğer yollar

- **Sayacı veritabanında tutmak:** Seçilmedi. Karar 0024'teki gerekçe burada da geçerli; her site tek süreçtedir.
- **Hesabı süresiz kilitlemek:** Seçilmedi. Saldırgan mağaza sahibini panelden büsbütün dışarıda bırakırdı.
- **Yalnız bağlantı başına saymak:** Seçilmedi. Kart ikisini de istiyor, adres değiştiren saldırgan hesap sayacına takılır.
- **Yalnız ara katman ya da yalnız düzen:** Seçilmedi. Gerekçesi yukarıda.
- **Şifreyi komuta parametre olarak vermek:** Seçilmedi. Komut geçmişine yazılırdı.
- **Bileşen kütüphanesini ve tasarım değerlerini şimdi kurmak:** Seçilmedi. Kart panel tasarımını dışarıda bırakıyor.

## Sonuçları

- Mağaza sahibinin e-postasını bilen biri bilerek yanlış deneyip sahibi 15 dakika dışarıda bırakabilir ve bunu sürdürebilir. Kabul edildi; iki aşamalı giriş kart 0028 ile gelir, bu sınırı değiştirmez.
- Sayaç uygulama yeniden başlayınca sıfırlanır. Her yayında saldırganın bütçesi tazelenir; kabul edildi.
- Sayaç anahtarı bellekte e-postayı tutar, 15 dakikalık süreyle silinir. Çok sayıda rastgele e-posta belleği geçici olarak büyütür, üst sınırı yoktur; `siki` istek sınırı hızını keser.
- Düzen Next.js'te gezinirken yeniden çizilmeyebilir, ikinci katman tam sayfa yüklemede çalışır. Gezinme isteklerini ara katman korur.
- Panel her istekte bir, tam sayfa yüklemede iki oturum sorgusu atar.
- Ara katman ayrı pakettir ve kendi veritabanı havuzunu açar (ölçüldü: bağlantı sayısı 1'den 2'ye çıktı). Sitenin bağlantı üst sınırı bu yüzden iki katına çıkar (havuz başına 10).
- Veritabanı kapalıyken panel adresi gövdesiz 503 döner; ön kapı bakıma geçene kadar açıklama görünmez. Çerezsiz ziyaretçi de ara katmana takılmaz, giriş sayfası açılır ama gönderim hata verir.
- Ara katman hatalarının hata izleme aracına ulaşmadığı ölçüldü; uç hatalarıyla birlikte kart 0049'dadır.
- Rolü olmayan yönetici boş panele girer: henüz gösterilecek veri yoktur. Panel sayfaları yetkiyi kendi uçlarından alır.
- Bu kartla sunucuda panel girilemez olur (kart 0048). `pnpm bakim-denemesi` yeni davranışa çevrildi ama sunucuda çalıştırılmadı.
- Giriş sayfasında otomatik kontrast ve erişilebilirlik taraması yoktur: ekran ölçümü kontrolü kurulmadı. Chromium'da açık ve koyu temada bir kez ölçüldü: başlık, alan ve düğme kontrastı AA'yı geçiyor (en düşüğü koyu temada düğme, 5,33). Öteki tarayıcılar ölçülmedi.
- Bileşen kataloğu ve "önce uyarı" kuralı henüz yoktur (`.claude/rules/bilesenler.md`).
