# 0098 · Müşterinin hesabı üst kısımdaki Hesabım menüsünde

## Tarih

2026-11-10

## Karar

- **Hesabım menüsü (kullanıcının kararı):** Üst satırdaki "Hesabım", giriş yapmış müşteriye e-postasını ve "Çıkış yap"ı gösteren bir menü açar; girişsiz müşteriyi giriş sayfasına götürür. Her vitrin sayfasında çalışır. Telefonda yan penceredeki hesap öğesi girişli müşteride e-postayı ve "Çıkış yap" düğmesini gösterir.
- **Oturum tek yerden:** Oturumu sorma ve çıkış `cekirdek/vitrin/hesap-durumu.ts` dosyasındadır (`useHesapDurumu`, `cikisYap`). Sade ana sayfanın hesap alanı, Hesabım menüsü ve yan pencere onu kullanır. Sayfa yüklemesi başına oturum ucuna tek istek gider, kullananlar cevabı paylaşır.
- **Bilinmeyen durum tarafsızdır:** Cevap gelene kadar ve sunucu ya da ağ hatasında Hesabım, sunucunun çizdiği "Hesabım" bağlantısıdır. "Giriş yap" yazmaz, e-posta göstermez (karar 0051 ile aynı ilke).
- **Katalogda oturum sorulmaz:** Vitrin bağlamının `musteriOturumu` alanı gerçek vitrinde `sorulur`, katalogun örnek bağlamında `ornek`tir. Örnek kipte istek gitmez.

## Neden

- Ana sayfada bölüm olunca sade sayfanın hesap alanı çizilmiyordu. Girişli müşteri giriş yaptığını göremiyor ve çıkış yapamıyordu (kart 0129'da ölçüldü).
- Oturum ucunun cevabı yenilenen oturum anahtarını taşıyabilir (karar 0039). Aynı sayfada üç parçanın ayrı ayrı sorması aynı yenileme anahtarını aynı anda birden çok kez kullanırdı.
- Girişsiz istek 401 alır, tarayıcı bunu konsola hata olarak yazar (ölçüldü). Katalog sayfalarının testleri konsol hatası sayar, katalogda gerçek müşteri de yoktur.

## Düşünülen diğer yollar

- **Hesap alanını bölümlü ana sayfada da bölümlerin üstünde tutmak:** Küçük bir değişiklikti ama yalnız ana sayfada çalışırdı. Kullanıcı Hesabım menüsünü seçti.
- **Şimdilik bırakıp testleri sade sayfada çalıştırmak:** Eksik kalırdı, testler gerçek siteyi görmezdi.
- **Girişsiz durumda 200 dönen yeni bir herkese açık uç:** Konsoldaki 401'i kaldırırdı ama kapıya isteğe bağlı oturum okuma eklemek gerekirdi. Ziyaretçi bu satırı görmez, kazancı küçüktü.

## Sonuçları

- Girişsiz ziyaretçinin tarayıcısı her vitrin sayfasında oturum ucuna bir istek gönderir ve konsolunda 401 satırı görünür. Ziyaretçi bunu görmez.
- Sayfalar arasında tarayıcı içi geçişte oturum yeniden sorulmaz. Giriş, kayıt ve çıkış sayfayı baştan yüklediği için durum değişince yeniden sorulur.
- Müşterinin hesap sayfası (siparişler, adresler) gelince menüye eklenecek.
