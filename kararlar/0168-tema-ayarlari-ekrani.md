# 0168 · Tema ayarları ekranı: önizlemesiz, ayrı sayfa, seçenek adları kayıtta

## Tarih

2026-11-22

## Karar

Mağaza sahibinin tema ayarları (logo, renkler, yazı tipi, köşe ve düğme biçimi, vitrinde koyu tema, masaüstünde filtrenin yeri) Tema'nın alt sayfası "Tema ayarları"ndadır (`/yonetim/tema/ayarlar`, kart 0260). Tema sayfasında yalnız tema seçimi kalır, iki sayfa komut çubuğundan birbirine bağlanır. Logo ve filtrenin yeri Tema sayfasından buraya taşındı.

Kullanıcı kararları (2026-11-22):

- Panelde önizleme yoktur (karar 0080 aynen geçerli). Taslaktaki (karar 0157) "Önizleme" kutusu yapılmadı; yerine seçenek kartlarında küçük sabit örnekler ("Ağ" yazısı, köşe, düğme) ve temanın "Demoyu gez" bağlantısı vardır. Değişiklik "Kaydet ve yayınla" ile hemen yayınlanır, "Önceki hâline dön" ile geri alınır.
- Ayarlar Tema'nın altında ayrı bir sayfadadır (taslak).
- Vitrinde koyu tema bu sayfadaki bir açma-kapama anahtarıdır, varsayılanı kapalıdır.

Teknik kararlar:

- Logodan sonraki bölümler tek formdur: bir kayıt temanın tek yeni sürümüdür. Logo kendi ucuyla hemen yüklenir (kart 0094).
- Okunmayan renk kayıtta sunucuda ölçülür; ret alanın altında yazar, sunucunun önerdiği en yakın okunur ton "Bu tonu kullan" ile tek basışta alana gelir. Renk ekranda kayıttan önce ölçülmez: ölçü temanın tanımını ister, tanım tarayıcıya gitmez (karar 0129).
- Mağaza sahibine açılabilen renkler ve köşe ile düğme biçimi seçeneklerinin kodları kayıttadır (`magazaRenkleri`, `koseSecenekleri`, `dugmeBicimiSecenekleri`, `cekirdek/kayitlar/tema.ts`), adları metin dosyasında. Tema yalnız bunları açabilir; adı olmayanı açan tema şemadan geçmez (`renk-acilamaz`, `secenek-adsiz`). Yazı tipi seçeneğinin adı kendi yazı tiplerinin adıdır ("Jost ve Inter").
- Mağaza sahibinin hiç seçmediği grupta temanın kendi değerine eşit seçenek seçili görünür; eşit seçenek yoksa grubun başında "Temanın kendi" seçeneği durur. Dokunulmadan kaydedilen seçim ve temanın kendi rengine eşit renk yazılmaz (`temaAyarlariGirdisi`): gereksiz sürüm yazılmaz.
- Rengin alanı kütüphanenin yeni parçasıdır (`RenkAlani`): onaltılık kod ve tarayıcının renk seçicisi. Seçenek kartları `SecenekGrubu`'nun örnekli görünümüdür (`gorunum="ornekli"`).

## Neden

- Önizleme vitrinin parçalarını taslak değerlerle ikinci kez çizmeyi gerektirir; karar 0080'deki gerekçe sürüyor, tek adımlık geri dönüş yanlış yayını kolayca düzeltir.
- Ayrı sayfa tema seçimini (sık değil, düzeni değiştirir) ayarlardan (sık, düzene dokunmaz) ayırır; taslak böyle çizildi.
- Seçenek adlarını kayda bağlamak panelde adsız ya da kodla görünen seçeneği önler; siteye özel tema da aynı adları kullanır.

## Düşünülen diğer yollar

- Taslaktaki küçük önizleme kutusu: karar 0080 ile çelişiyordu, kullanıcı karara uymayı seçti.
- Ayarların Tema sayfasının altında kalması: sayfa uzun ve iki ayrı kayıt düzeni (tema seçimi penceresi, ayar formu) yan yana kalırdı.
- Rengi tarayıcıda canlı ölçmek ("Açık ve koyu temada okunur" yazısı, taslak): temanın renklerini ve bağlarını tarayıcıya göndermek gerekirdi (karar 0129); yalnız kayıtta ölçülür.
- Seçenek adlarını tema dosyasına yazmak: hazır temalarda aynı seçenek üç kez adlandırılır, çeviri tek yerde durmazdı.

## Sonuçları

- Okunmayan renk ancak "Kaydet ve yayınla"dan sonra söylenir; mağaza sahibi önce kaydetmeyi dener.
- Yeni bir renk ya da köşe ve düğme seçeneği açmak isteyen tema önce kayda kod ve metin dosyasına ad ekletir.
- Koyu temada okunmayan renk reddedilmez; vitrin okunur tonunu kullanır (karar 0080'in kuralı), ekran bunu yalnız açıklamada söyler.
- Ekran yazı tipi örneğini sitede barındırılan yazı tipleriyle çizer; panelin yüklemediği bir yazı tipi tarayıcının yedeğiyle görünebilir.
