# 0054 · Sunucuda yönetici, yayındaki görüntünün parçasıyla ve günlüğü kapalı geçici kutuda açılır

## Tarih

2026-11-07

## Karar

- **Komut:** `pnpm sunucu-yonetici-ac <site klasörü> deneme <e-posta>`. Yayındaki görüntünün `yonetici/yonetici.mjs` parçasını geçici kutuda çalıştırır: sitenin kutu kullanıcısı, sitenin ağı, salt okunur, yetkisiz, yalnız o sitenin veritabanı gizli dosyası.
- **Şifre:** Parça üretir, standart çıktıya bir kez yazar, komut ekrana basar. Kutu `--log-driver none` ile çalışır. Ssh üzerinden yalnız şifreli akışla gelir, dosyaya yazılmaz.
- **Başka site:** Veritabanı adresi verilen kod adının değilse parça hiçbir şey yapmaz. Denetim tek işlevdedir (`siteninAdresi`), `sunucuda-guncelle.ts` de bunu kullanır.
- **Hesap kapatma:** Parçada `kapat` vardır, son tam yetkili kuralına uyar. Panel denemesi ve `pnpm sunucu-yonetici-kapat` kullanır; ekran gelmedi.
- **Tekrarlanabilir ölçüm:** `pnpm panel-denemesi` geçici yöneticiyle gerçek tarayıcıda ölçer, hesabı kapatır, şifre ve kodları yazmaz.
- **Deneme yöneticisinin e-postası (kullanıcı kararı):** `magaza-sahibi@ornek.test`. Komutu kullanıcı kendi penceresinde çalıştırır: şifre sohbete ve Claude'un kayıtlarına girmez.

## Neden

- **Yayındaki görüntü:** Parça çalışan sürümle aynı kod ve tablolarla çalışır. Sitenin şifresi bilgisayara gelmez (karar 0031, 0034).
- **Günlüğü kapalı:** Docker kutunun çıktısını varsayılan olarak diske yazar, `--rm` bunu ancak kutu silinince siler; kesintide kalabilirdi.
- **Geçici hesabın kapanması:** Silinemeyen, parolası kimsede olmayan tam yetkili hesap açık kalmamalı. Son sahip kapatılamadığı için panel denemesi site sahibinin hesabı açıldıktan sonra çalışır.

## Düşünülen diğer yollar

- **Şifreyi bilgisayarda üretip kutuya göndermek:** Seçilmedi. Kart komutta üretmeyi istiyor, akışa bir yol daha eklerdi.
- **Çalışan site kutusunda `docker exec`:** Seçilmedi. Günlüğü kapalı değildir, kutunun yetkileri parçaya gerekmez.
- **Şifreyi Claude'un çalıştırması:** Kullanıcı seçmedi. Şifre sohbet kaydına girerdi.
- **Geçici yönetici için son sahip kuralını atlamak:** Seçilmedi. Rol kuralının istisnası olmaz.

## Sonuçları

- **Şifre terminalde görünür:** Kullanıcının pencere geçmişinde kalır. Sonraki iş olarak şifre değiştirme ekranı yoktur; şifremi unuttum sunucuda kart 0060'a kadar çalışmaz.
- **Kurtarma yok:** Şifre ya da telefon kaybolursa bu deneme sitesinde yeni hesap açılır, gerçek mağazada kart 0053 gerekir.
- **Yalnız deneme ortamı:** Yayın yalnız orada vardır. Canlı ortam gelince komut genişler.
- **Eski yayında çalışmaz:** Parça 0.12.1 ve sonrasındadır. `pnpm geri-don` bundan eskiye dönerse komut hata verir.
- **Teslim akışı yok:** Mağaza sahibinin ilk girişte şifre belirlemesi site komutlarıyla gelecek.
- **Panel denemesinin kırılganlığı:** Sitede başka tam yetkili yoksa hesap açılmadan durur, tarayıcı hesaptan önce açılır. Hesap adı başta yazar, kapanış başarısız olursa `pnpm sunucu-yonetici-kapat` ile kapatılır. Süreç öldürülürse hesap açık kalabilir, şifresi kimsede olmaz.
- **Arka arkaya çalışmaz:** Giriş ucunun sınırı dakikada 5 istektir, deneme 4 istek atar. Bir dakika içinde ikinci kez çalışırsa yanlış kırmızı verir.
- **Saat kayması:** Deneme kodu bilgisayarın saatiyle üretir. Saat 10 saniyeden çok ileriyse kod ekranı kırmızı olabilir (bağımsız kontrolün hesabı).
- **Geçici kutunun bayrakları testte yok:** `pnpm yerel-ortam-testi` parçayı çalışan kutuda dener. Gerçek bayraklarla ölçüm sunucudaki komut ve panel denemesidir, bağımsız kontrol de yerel görüntüyle bir kez ölçtü.
