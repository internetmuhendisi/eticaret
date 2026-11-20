# 0149 · Müşteri hesabı ve adres defteri

## Tarih

2026-11-20

## Karar

Müşterinin Hesabım bölümü `/hesabim` altındadır: Adreslerim, Favorilerim ve Hesap bilgileri (kart 0237; Siparişlerim kart 0238 ile eklenir). Menü masaüstünde solda, telefonda yatay kayan şerittir (karar 0145). Hesabın açılış sayfası `hesapIlkSayfasi`'dır: karar 0145'e göre Siparişlerim, o gelene kadar Adreslerim.

Kullanıcının kararları:

| Soru | Karar |
|---|---|
| Hesap bilgileri bu kartta ne kadar | Yalnız şifre değiştirme ve kampanya izni. Ad, soyad ve telefon hesaba eklenmez (adreslerde vardır); kayıt formu değişmez. E-posta yalnız görünür. |
| Ödemede "önceki siparişin adresi" önerisi | Yalnız adres defteri boşken kalır. Kayıtlı adresi olan müşteri defterden seçer. |
| "Adreslerime kaydet" kutusu | Defteri boş müşteride işaretli, kayıtlı adresi olanda işaretsiz gelir. |

Teknik kararlar:

- Adres defteri müşteri modülündedir (`musteri_adresleri`, `cekirdek/moduller/musteri/adres.ts`). Adresin alanları ödemenin teslimatıyla aynı şemadır (`teslimat-semasi.ts`); telefonun zorunluluğu ve teslimat ülkesi ödemeyle aynı işlevle denetlenir (`teslimatKuraliHatasi`). Sınır kayıttadır (`musteriAdresiSinirlari`, 20 adres).
- Her türde (teslimat, fatura) en çok bir varsayılan adres vardır; varsayılanı olmayan türde ilk adres varsayılan olur, silinen varsayılanın yerine kalanların en yenisi geçer. Veritabanında kısmi tekil indeks, serviste müşterinin satırı kilitlenerek (`for no key update`: müşteriye bağlı satırların eklenmesini bekletmez) denetlenir.
- Silinen adres kalıcı silinir, işaretlenmez. Siparişteki adres kendi kopyasıdır, değişmez.
- Adres ve kampanya izni değişiklik kaydına girmez (favorilerle aynı, karar 0110).
- Şifre değişince hesabın bütün oturumları ve açık şifre sıfırlama bağlantıları kapanır, bu cihaz için yeni oturum açılır, "şifreniz değişti" e-postası gider. Şu anki şifre girişle aynı deneme sınırıyla doğrulanır. Hesap satırı baştan yazma kilidiyle alınır (`sifreDegismediyse(…, "update")`): aynı anda iki değişiklikte biri geçer, öteki "şifre yanlış" alır.
- "Adreslerime kaydet" ödeme oturumunun işleminde yapılır: oturum açılamazsa (stok, yöntem) adres de yazılmaz. Kartla ödemede ödeme kuruluşunda sonuçlanmasa da adres defterde kalır: müşteri kaydetmeyi kendisi seçmiştir, adresin doğruluğu ödemeye bağlı değildir.
- Kayıtlı adres seçiliyken teslimat alanı elle değişince seçim "Yeni adres"e geçer, alanlar kalır, "Adreslerime kaydet" görünür.
- Hesap sayfaları oturumu sunucuda, anahtarı değiştirmeden okur (`hesapOturumu`, panelin `panelOturumu` ile aynı yol): verisini sunucuda çizer, girişsiz müşteriyi girişe yönlendirir. Ürün sayfalarının "sayfa oturum okumaz" kuralı (karar 0039) kişiye özel olmayan sayfalar içindir.
- Vitrinin hesap durumu sorusu herkese açık `GET /kapi/herkese-acik/hesap-durumu`'dur (kart 0187): girişsiz ziyaretçi 401 değil "girişsiz" cevabı alır, konsola hata düşmez. Oturum çerezi tarayıcı koduna kapalı olduğu için (HttpOnly) çerezi tarayıcıda görüp soruyu atlamak yolu yoktur.
- Girişli müşteride üst satırın kalbi ve yan penceredeki favoriler bağlantısı Favorilerim'e gider; üye olmayanda favoriler sayfası kalır.
- Doğrudan girişe gelen müşteri girişten sonra hesabına gider; kayıttan sonra geldiği sayfaya döner (dönüş adresi girişten kayda taşınır). Taslağın onaylı notları (kart 0233).
- Hesabın yararları kutusunda yalnız bugün olan işler yazar (adres ve favori); sipariş takibi ve iade talebi kartlar 0238 ve 0239 ile eklenir.

## Neden

- Defter ödemeyle aynı şemayı ve kuralı kullanınca kayıtlı adres ödemede hata vermeden seçilir; kural tek yerde kalır.
- Tek varsayılan kuralı iki katmanlıdır: aynı anda gelen iki "Varsayılan yap" ya da ekleme serviste kilitle, gözden kaçan yazım veritabanında durur.
- Adres kişisel veridir; silinmiş işaretli adres müşterinin "sildim" dediği veriyi tutardı. Siparişler kendi kopyalarını tuttuğu için kalıcı silmenin bedeli yoktur.
- Şifre değişince öteki cihazdaki oturum eski şifreyle açılmıştır; şifre sıfırlamayla aynı ilke (karar 0052).
- Hesap sayfaları kişiye özeldir, önbelleğe girmez: sunucuda okumak ilk ekranı iskeletsiz çizer (hız hedefi) ve girişsiz müşteriyi sayfa açılmadan yönlendirir.

## Düşünülen diğer yollar

- **Adresi ayrı bir modülde tutmak:** Müşteriye bağlı tek tablo için ayrı modül gereksizdi; izinler ve hesap aynı modülde.
- **Adresi silinmiş işaretlemek:** Veri kuralının varsayılanı budur; kişisel veri için seçilmedi (yukarıda).
- **Hesap durumunu çerezden okumak:** Çerez HttpOnly'dir, tarayıcı göremez. Ayrı bir görünür işaret çerezi oturumla eşitlenmesi gereken ikinci bir durum olurdu.
- **Hesap sayfalarını tarayıcıda uçtan doldurmak:** Ürün sayfalarının yolu; ilk ekran iskeletle gelir ve girişsiz müşteri önce boş sayfayı görürdü.
- **Hesaba ad, soyad ve telefon eklemek:** Taslakta vardı; kullanıcı bu kartta seçmedi.

## Sonuçları

- Siparişlerim (kart 0238) gelince `hesapIlkSayfasi` ve hesap menüsüne bir öğe eklenir; yararlar kutusuna sipariş takibi maddesi eklenir.
- Hesap sayfaları girişsiz açılamadığı için bugünkü ekran ve hız ölçümüne (girişsiz) girmez; taramaları kendi tarayıcı testlerindedir, hız ölçümü ayrı kartta.
- Ödeme sayfası ve Adreslerim il ve ilçe listesini tarayıcıya taşır (adres şeması onunla doğrular); Adreslerim'in kodu ödeme sayfasınınkine yakındır.
- Eski `GET /kapi/musteri/hesabim` ucu kalır; vitrin artık onu sormaz.
