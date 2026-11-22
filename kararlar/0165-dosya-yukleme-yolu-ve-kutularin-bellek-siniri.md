# 0165 · Dosya yükleme yolu, iki katmanlı gövde sınırı ve kutuların bellek sınırı

## Tarih

2026-11-22

## Karar

- **Gövde:** Dosya yükleyen uç `govde: "dosya"` ile yazılır (`cekirdek/kapi/uc.ts`). İsteğin gövdesi dosyanın kendisidir (ham bayt), uç girdiyi `{ dosya: Uint8Array }` olarak alır. Tür içerikten anlaşılır (dosya servisi, karar 0058); ad ve uzantı gönderilmez.
- **Sınır iki katmandadır:**
  - Kapı, bildirilen uzunluk dosya sınırını (`dosyaSinirlari.enCokBayt`, 10 MB) aşıyorsa gövdeyi hiç okumaz. Uzunluk bildirilmemişse okurken sınır aşılınca okumayı keser. İki durumda da `dogrulama` (`dosya`, `cok-buyuk`) döner.
  - Sunucudaki ön kapı yükleme adreslerinde gövdeyi dosya sınırı ve 64 KB pay ile sınırlar (`request_body`, `yuklemeGovdeSiniri`). Aşan istek kutuya ulaşmadan 413 alır.
- **Yükleme adresi:** Yükleme uçlarının adı `-yukle` ile biter (`/kapi/yonetici/<ad>-yukle`), ön kapı onları bu kalıpla bulur (`yuklemeYoluKalibi`). Test iki yönü de denetler: dosya gövdesi alan her uç kalıba uyar, kalıba uyan her uç dosya gövdesi alır ve POST'tur.
- **İstek sınırı:** Yeni `yukleme` sınırı, 60 saniyede 30 istektir. Bu sınır galeriye art arda birkaç görsel yüklemeye yeter, sunucuyu dolduran seri yüklemeyi durdurur. Robot koruması yoktur: yükleme uçları yalnız iki aşamalı girişten geçmiş yöneticiye açıktır.
- **Tarayıcıda:** Yükleme `kapiyaYukle` ile gider (`cekirdek/kapi/istemci.ts`, kapıya giden isteklerin tek dosyası). Bu işlev XMLHttpRequest kullanır, çünkü fetch yüklemenin ilerlemesini vermez. İlerleme bildirilir, sinyal yüklemeyi iptal eder.
  - Panelin isteği `panelYuklemesi` ile gider. Ön kapının zarfsız 413'ü kapının kendi reddiyle aynı alan hatasına çevrilir.
  - Kanca `useDosyaYuklemesi`'dir. Sınırı aşan dosya için istek gitmez, sürerken ikinci yükleme yok sayılır.
  - Görüntü ortak parça `DosyaYukleme`'dir (`bilesenler/parcalar/dosya-yukleme.tsx`): seçme düğmesi, ilerleme çubuğu ve İptal. Sürerken seçme düğmesi `aria-disabled` olur, odak kaybolmaz.
- **Logo:** Uçları `logo-yukle` ve `logo-kaldir`'dır, izinleri `magaza-ayarlari.degistir`. Logo panelde Tema ekranının "Logo" bölümündedir (kullanıcı kararı, kart 0094). Logo mağaza ayarıdır: "Mağaza sahibi temayı değiştirebilir" ayarına bağlı değildir.
- **Bellek:** Site kutusu ve arka plan kutusu 1 GB bellekle sınırlıdır, takas alanı yoktur (`siteKutusuBellekSiniri`, `komutlar/kutu-kurali.mts`). Sınır sunucuda, yerel ortamda ve kontrol hattında aynıdır.
  - Sunucu denetimi kutunun gerçek bellek ve takas sınırını tanımla karşılaştırır. Tanımında sınır olmayan kutularda (veritabanı, ön kapı, hata izleme) gerçek değer 0 beklenir.
  - Sınır çekirdeğin sürümüne değil, yayın komutunun yazdığı kutu tanımına bağlıdır. Geri dönüş, dönülen yayının kendi tanımını açar. Bu yüzden yayın kaydı yayın anındaki sınırı yazar (`bellekSiniri`). Denetim, etkin kutuyu kuran yayının kaydından okur (`etkinYayinBellegi`, `kayittakiBellekle`). Bu alandan önceki yayınların kutusu sınırsız sayılır; sunucu denetimi onları kırmızı yapmaz, sonraki yayınlarıyla sınır gelir.
- **Dosya türlerinin adları:** Ekran metnine dosya kaydından gelir (`yuklenebilenTurAdlari`, biçimleyicinin `veyaListesi`'yle: "JPEG, PNG veya WebP"). Metne elle yazılmaz.

## Neden

- Ham bayt gövde, form biçiminin ayrıştırıcısını ve sınır işaretlerini gerektirmez. Dosya servisi zaten türü içerikten bulur, adı ve uzantıyı kullanmaz.
- Gövde sınırının kapıda olması, ön kapının arkasında olmayan ortamlarda da (yerel, kontrol hattı) sınırı korur. Ön kapıdaki sınır ise büyük gövdeyi uygulamaya hiç ulaştırmaz. Uygulama Caddy'nin kalıbına uymayan bir yazılışla çağrılsa da ikinci katman tutar.
- Yayın kaydına bağlanmasının nedeni bağımsız kontrolün bulgusudur: tanımla doğrudan karşılaştırma, bu değişiklikten önce yayınlanmış her kutuyu kırmızı yapar. Yayın komutu yalnız yayınlanan sitenin kendi satırını hoş gördüğü için bu, başka bir sitenin yayınını durdururdu.
- Bellek değeri ölçümle seçildi. Yerel ortamda, çekirdeğin görüntüsünde, kutunun içinde 40 milyon piksellik (8000 × 5000) bir PNG logo yüklendi. Kutunun bellek zirvesi (`memory.peak`) iki ölçümde 330 ve 332 MB oldu; bu, Next.js sürecinin kendi belleğiyle birliktedir. 1 GB, iki eşzamanlı büyük yüklemeye ve sürecin büyümesine pay bırakır. Sunucuyu paylaşan 5–30 site için toplam üst sınırı da öngörülebilir kılar.
- Logonun Tema ekranında durması, mağaza sahibinin onu tema ayarlarıyla (kart 0260) aynı yerde bulmasını sağlar (`.claude/rules/tasarim-sistemi.md`).

## Düşünülen diğer yollar

- **Form biçimiyle (multipart) yükleme:** Seçilmedi. Sınırları ve alanları ayrıştırmak ek kod ister, ek bilgi taşımaz. Birden çok dosya gerekirse her dosya kendi isteğiyle gider, ilerleme dosya başına olur.
- **Sınırı yalnız ön kapıda tutmak:** Seçilmedi. Yerel ortamda ve kontrol hattında ön kapı yoktur, kalıba uymayan yazılış sınırın dışında kalırdı.
- **Bütün site adreslerine genel gövde sınırı:** Bu kartta yapılmadı. Büyük JSON gönderen ekranlar (ürün açıklaması, vitrin bölümü) ölçülmeden konulan bir sınır onları bozabilir. Ayrı iş olarak yazıldı.
- **Bellek sınırını 512 MB koymak:** Seçilmedi. Ölçülen 330 MB'lık zirve, aynı anda iki yüklemede ya da süreç büyüyünce 512 MB'a çok yaklaşır.
- **Logoyu ayrı bir "Mağaza bilgileri" ekranına koymak:** Seçilmedi. Logo tema ayarıdır, mağaza bilgileri ekranı (kart 0278) adres ve iletişim içindir.

## Sonuçları

- Ön kapının `request_body max_size` ayarı uzunluk başlığına bakarak hemen reddetmez. Gövde okunurken sınır aşılınca 413 verir. Gerçek Caddy (2.10.2) ile bir kez ölçüldü:
  - Sınırda gövde geçti; bir bayt fazlası, `%2D` ile kodlanmış ve çift eğik çizgili yazılış ve uzunluk bildirmeyen gövde 413 aldı.
  - Başka yollar etkilenmedi.
  - Büyük harfli yazılış (`LOGO-YUKLE`) Caddy'den geçti, ama Next.js adreslerde harf ayırdığı için o adreste uç yoktur; kapının sınırı yine tutar.
  - Bu ölçüm testte yoktur. Testte site satırının ayarı ve kalıbı denetlenir (`komutlar/testler/on-kapi.test.ts`).
- Yerel ortam denemesi kutunun bellek zirvesinin sınırın yarısının altında kaldığını ölçer. Sınırın kendisi aşılamaz (süreç durur, yükleme 200 almaz); ölçülen, iki büyük yüklemeye pay bırakılmasıdır. Zirve kutunun açılışından beri en yüksek değerdir. İki yüklemenin gerçekten aynı anda yapılması ölçülmedi.
- Bellek sınırını aşan süreç kutusuyla birlikte durur ve yeniden başlar (`unless-stopped`). O sırada süren istekler düşer. Bu, sunucunun bütün sitelerle birlikte belleksiz kalmasından iyidir.
- Gerçek bir mağazaya logo ya da başka dosya yüklenmesi hâlâ dosyaların yedeğini bekler (kart 0093, karar 0058). Bunun kontrolü yoktur, yalnız disiplindir.
- Yükleme uçlarının adının kalıba uyması testle korunur. Kalıbın sunucudaki ön kapıya gerçekten uygulanması ilk yayında görülür.
- Ekranda yüzde yazısı yoktur. İlerleme çubuğunun oranı ekran okuyucuya okunur; görünen yüzde için biçimleyicinin istemcide kurulması gerekirdi.
