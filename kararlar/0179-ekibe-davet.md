# 0179 · Ekibe davet

## Tarih

2026-11-25

## Karar

- **Davet:** Mağaza sahibi Ekip ekranının "Davet et"iyle e-posta ve bir ya da birden çok rol seçerek davet gönderir (kart 0275, izin `ekip.davet-et`, yalnız tam yetkili rolde). Mağaza sahibi rolü davetle verilmez (taslaktaki seçim): gerekirse kişi katıldıktan sonra kullanıcının ekranından verilir.
- **Bağlantı:** 32 bayt rastgele anahtar, adresin `#` sonrasında (`/yonetim/giris/davet#anahtar=…`), veritabanında yalnız SHA-256 özeti. 3 gün geçerli ve tek kullanımlık (karar 0157). Geri alınabilir. Kullanılmış, süresi dolmuş, geri alınmış ve uydurma bağlantı aynı cevabı alır ("Bu davet geçerli değil").
- **Bağlantının gösterilmesi:** Davet e-postası kuyruğa girer (`yonetici-daveti`). Sunucuda gerçek gönderim yokken (kart 0060) bağlantı "Davet hazır" penceresinde bir kez gösterilir, "Kopyala" ile alınır; pencere kapanınca bir daha gösterilmez.
- **Kabul:** Davetle gelen kişi adını ve şifresini koyar. Hesap davetin e-postası ve rolleriyle aynı işlemde açılır, bağlantı harcanır ve iki aşamalı girişin kurulumu için ara adım açılır (`girisAdimiYaz`). Oturum açılmaz: kişi kurulum ekranına geçer, telefonunu bağlar, sonra panele girer (karar 0044).
- **Yöneticinin adı:** `yoneticiler.ad` alanı (boş başlar). Davetle gelen yöneticinin adı listede ve kullanıcının ekranında görünür; sunucudan açılan hesapta e-posta görünür. Ad değiştirme ekranı bu kartta yoktur.
- **Kurallar:** Ekipte açık hesabı olan e-posta davet edilmez (`ekipte`); aynı e-postanın bekleyen daveti varken ikincisi gönderilmez (`davet-var`); bir sitede aynı anda en çok 20 davet bekler (`davet-siniri`). Kapatılmış hesabın e-postası yeniden davet edilebilir (kullanıcı kararı): yeni hesap açılır, eski hesap kapalı kalır. Davetten sonra aynı e-postayla hesap açılmışsa kabul `hesap-var` alır, davet harcanmaz.
- **Gönderenin hesabı kapanırsa** bekleyen davetleri geri alınmış sayılır (her biri kayda girer); kapanan hesabın davetiyle hesap açılmaz.
- **Kilit:** Davet, geri alma, kabul ve hesap kapatma yetki işlemlerinin ortak kilidini (tam yetkili rollerin satırları) alır; işi yapanın izni kilitten sonra yeniden sorulur.
- **Kayıt:** `yonetici-daveti.gonderildi` (roller), `.geri-alindi`, `.kabul-edildi` (yeni yöneticinin yaptığı). Kabulde verilen roller `rol.verildi` olarak daveti gönderenin adıyla girer. E-posta kayda girmez.
- **Temizlik:** Davetin satırı (e-posta kişisel veridir) süresi dolduktan 30 gün sonra günlük işle silinir (`davet-temizligi`).
- **Kabul uçları** herkese açık girişte, sıkı sınırlıdır; robot sorusu yoktur (anahtar tahmin edilemez). Tema demosunda kapalıdır: hesap doğurur.
- **Ekran:** davet ve "Davet hazır" yan penceredir (taslak); gönderim bildirim vermez, sonucu pencere söyler (`usePanelIslemi`'nin `bildirim: () => null`'ı). Pencere kapanınca ve geri alınan satır kalkınca odak "Davet et"e geçer.
- **Kopyala düğmesi** kütüphaneye taşındı (`KopyalaDugmesi`): ikinci kullanım geldi, ilki (IBAN) ona çevrildi.

## Neden

- Bağlantının `#` sonrasında durması şifre sıfırlamanın yoludur (karar 0052): sunucu günlüğüne, Referer'a düşmez, e-posta programının önizlemesi bağlantıyı harcamaz.
- Hesabın kabulde açılması: davet bekleyen kişi panelde hesap olarak görünmez, rolsüz ya da şifresiz hesap kalmaz; geri alınan davet hiçbir iz bırakmaz.
- Kabulden sonra doğrudan kurulum ekranı: kişi yeni koyduğu şifreyi hemen bir daha yazmaz, iki aşamalı giriş yine atlanamaz.
- Mağaza sahibi rolünün davetle verilmemesi: ele geçmiş bir bağlantı en fazla sınırlı rol açar; tam yetki her zaman açık bir kullanıcıya, ekrandan, ayrı bir adımla verilir.
- Bekleyen davet sınırı: ele geçmiş bir mağaza sahibi hesabı sınırsız bağlantı ve e-posta üretemesin.
- Kapatılmış hesabın e-postasını yeniden davet etmek (kullanıcı kararı): işten ayrılıp dönen çalışan için; eski hesabın kayıtları kendi kimliğiyle kalır.

## Düşünülen diğer yollar

- **Hesabı davet anında açmak, şifreyi kabulde koymak:** Geri alınan ve süresi dolan davet şifresiz hesap bırakırdı; ekip listesi bu hesapları ayıklamak zorunda kalırdı.
- **Kabulden sonra giriş sayfasına göndermek:** Ara adımı yeni bir yoldan açmamak için daha az kod; ama kişi az önce koyduğu şifreyi yeniden yazardı. Ara adım, şifresi aynı işlemde konan hesap için açılır.
- **7 günlük davet:** Karar 0157'de seçilmedi.
- **Robot sorusu:** Bağlantı tahmin edilemez ve uçlar sıkı sınırlıdır; soru yalnız gerçek kişiyi yorardı.
- **Kapatılmış hesabın e-postasını reddetmek:** Kullanıcı seçmedi.
- **Daveti yeniden göndermek düğmesi:** Taslakta yok; geri alıp yeni davet göndermek aynı işi görür, açık kalan tek bağlantı kuralı korunur.

## Sonuçları

- Bağlantı panelde bir kez görünür: mağaza sahibi kopyalamadan pencereyi kapatırsa daveti geri alıp yeniden gönderir.
- Gerçek e-posta gönderimi gelene kadar (kart 0060) bağlantıyı kişiye ulaştırmak mağaza sahibinin işidir.
- Sunucudan açılan yöneticinin adı yoktur; adın değiştirilmesi ayrı bir iştir.
- Gönderen hesabın kapanması bekleyen davetleri düşürür: mağaza sahibi ayrılmadan önce gönderdiği davetler kabul edilmemişse yeniden gönderilir.
- Yeni bir yol (kabul) ara adım açıyor: `girisAdimiYaz` yalnız şifresi az önce doğrulanmış ya da aynı işlemde konmuş hesap için çağrılır (yalnız disiplin).
