# 0059 · Mağaza logosu: ilk logo site klasöründe, yüklenen logo depoda, tek uçtan verilir

## Tarih

2026-11-07

## Karar

- **Hangi logo:** Tek işlev karar verir (`magazaLogosu`, `cekirdek/moduller/magaza-ayarlari/logo.ts`). Önce mağaza sahibinin yüklediği logo: `logo` ayarındaki dosya deposu kaydı (kart 0072). Yoksa sitenin ilk logosu: site klasöründe `marka/logo.png`, `.jpg` ya da `.webp`. O da yoksa logo yoktur, mağaza adı yazı olarak görünür. Yüklenen logo okunamazsa ilk logoya düşülür, hata kaydedilir.
- **İlk logo:** Altyapı sahibinin dosyasıdır, yayınla değişir. `pnpm site-dogrula` denetler: en çok bir dosya, tür içerikten okunur ve uzantıyla aynıdır, boyut dosya sınırını aşmaz. Yeniden kodlanmadan verilir.
- **Değiştirme:** `logoyuDegistir` yeni dosyayı kart 0072'nin yoluyla kaydeder, ayarı ona çevirir (değişiklik kaydına girer), eski yüklenen logoyu silinmiş olarak işaretler. `logoyuKaldir` ilk logoya döndürür. Ekran ve uç sonraki kartla gelir (kart 0094).
- **Uç:** `GET /kapi/herkese-acik/logo`. Kapıya dosya yanıtı eklendi (`DosyaYaniti`, `cekirdek/kapi/zarf.ts`): yanıt zarf değil dosyanın kendisidir; türü içerikten bulunmuş türdür, `X-Content-Type-Options: nosniff`, 5 dakika önbellek, içeriğin özeti `ETag`'dir, aynı etiketle gelen istek gövdesiz 304 alır. Hata yine zarfla döner, logo yoksa 404.
- **E-posta:** `logoAdresi` ayarı kaldırıldı. E-postadaki logo sitenin adresi (`siteAdresi`) ile logo ucunun adresidir, adres logonun özetini taşır. Logo ya da adres yoksa e-postada mağaza adı görünür.
- **Örnek Mağaza (kullanıcı kararı):** Projede üretilmiş, yazısız bir yer tutucu logo (`siteler/ornek-magaza/marka/logo.png`).
- **Görsel kütüphanesi:** Dosya servisi `sharp`'ı yalnız kaydederken yükler. Logoyu vermek ve site klasörünü okumak ona bağlı değildir.

## Neden

- Kapı dışında adres dosyası yazılamaz (`rol-uc-erisimi.test.ts`). Logoyu vermek için kapıya dosya yanıtı eklemek, izin, sınır ve hata katmanını dosya veren uçlara da kendiliğinden getirir.
- Tek adres, vitrinin, panelin ve e-postanın aynı logoyu göstermesini sağlar; yüklenen logo değişince adres değişmez, yalnız önbellek etiketi değişir.
- İlk logo site klasöründe durunca yeni bir site logosuyla kurulur, veritabanına bir şey yazmak gerekmez. Mağaza sahibi istediğinde kendi logosunu yükler.
- E-posta istemcileri görseli siteden ister; adresin özeti taşıması logonun değiştiğini istemcinin önbelleğine bildirir.

## Düşünülen diğer yollar

- **İlk logoyu kurulumda dosya deposuna aktarmak:** Seçilmedi. Aktarma ilk okumada dosya yazmayı ve yarışa karşı kilidi gerektirirdi; ilk logonun yeri zaten site klasörüdür (planlar/cekirdek-ve-siteler.md).
- **Logoyu kapı dışında bir adres dosyasıyla vermek:** Seçilmedi. Kapının denetimleri (sınır, hata katmanı, uç belgesi) dışında kalırdı; test bunu yasaklar.
- **`logoAdresi` ayarını tutmak:** Seçilmedi. İki logo kaynağı olurdu, vitrin ve e-posta farklı logo gösterebilirdi.
- **SVG ilk logo:** Seçilmedi (karar 0058).

## Sonuçları

- İlk logo yeniden kodlanmaz; içindeki gömülü bilgiler (EXIF gibi) olduğu gibi verilir. Dosya altyapı sahibinin olduğu için kabul edildi; logo eklerken gömülü bilgisi temiz dosya kullanılır. Piksel sayısı denetlenmez.
- Logo değişince vitrinde en geç 5 dakika eski logo görünebilir (önbellek).
- `logoAdresi` yazan bir site doğrulamadan geçmez (sürüm notu 0.16.0).
- Kart 0072'nin yükleme ucuna bağladığı iki koşul (kutulara bellek sınırı, `sharp`'ın görüntüde ölçülmesi) yükleme ekranının kartına (0094) taşındı: bu kartta yükleme ucu yok.
- Logonun vitrinde ve panelde nerede görüneceği tasarım işidir, bu karara girmez.
