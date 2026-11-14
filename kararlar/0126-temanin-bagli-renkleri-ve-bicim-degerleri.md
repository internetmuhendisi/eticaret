# 0126 · Temanın bağlı renkleri ve biçim değerleri

## Tarih

2026-11-14

## Karar

Yumuşak Mevsim ve Keskin Çizgi'nin taslaktan (karar 0075) ayrılan yerleri yeni tema değerleriyle yazıldı (kart 0124). Değerler `bilesenler/tasarim-degerleri/degerler.ts`'tedir, sayfaya CSS değişkeni olarak yazılır (`css.ts`):

- **Bağlı renkler** (`renkBaglari`): `rozet`, `rozet-ustu`, `afis-dugmesi`, `afis-dugmesi-ustu`, `vurgu-yazi`, `kart-kenari`. Tema her birini ya kendi rengiyle (`"#FFD43B"`) verir ya da bir renk adına bağlar (`"birincil"`). Bağ açık ve koyu temada ayrı olabilir (`{ acik: "yazi", koyu: "zemin" }`). Bağlı renk sayfada bağlandığı rengin değişkenini okur (`var(--renk-birincil)`). Canlı Çarşı'da her biri bugün kullanılan renge bağlıdır, görünüşü değişmez.
- **Okunurluk bağları çözerek ölçülür:** Bir rengin çiftleri, ona bağlı renklerin çiftlerini de kapsar (`renkleriCoz`, `okunmayanCiftler`). Temanın kendi değerleri, mağaza sahibinin ana rengi ve birleşimdeki okunur ton aynı ölçüden geçer.
- **Bağlantılar ve güven şeridinin ikonları ana rengi izler (kullanıcı kararı):** Yumuşak Mevsim'de ve Keskin Çizgi'de `vurgu-yazi` ana renge bağlıdır. Mağaza sahibinin ana rengi zeminde yazı olarak da okunur olmalıdır.
- **Başlık biçimi** (`baslikBicimi`): büyük harf ve harf aralığı. `font-baslik` sınıflı her yazı ve `h1`–`h4` temel katmanda alır. Başka öğe (kayan afişin düğmesi) `baslik-bicimi` sınıfıyla alır.
- **Tema boşlukları** (`bosluklar`): `kart-ici`, `bolum`, `bolum-masaustu`. **Ürün sütunu** (`urunSutunu`): geniş ekranda tam genişlikteki ürün ızgarası ve şeridi. Yan afişli ızgara üç temada dört sütundur (taslak).
- **Değerler zorunludur:** Siteye özel tema da bu değerleri yazar ("tema, tasarım değerlerinin tamamını tanımlar").

Taslaktan ayrılmaya devam eden yerler (yazılmadı):

- Fırsat panelinin ve bültenin zemini (Keskin Çizgi'de sarı) ile kayan afişin zemini (Keskin Çizgi'de lacivert) bölümün kendi değeridir. Kart bölümlere ve düzene dokunmaz.
- Taslakta tablette sırada dört ürün vardır, vitrinde üç temada da üç. Değiştirmek Canlı Çarşı'yı da değiştirirdi.
- Taslak Yumuşak Mevsim'de öne çıkanların beşinci ürününü gizler. Bu bölümün içeriğidir, yazılmadı.
- Keskin Çizgi'nin koyu temasında ikonlar ve bağlantılar ana rengin koyu tonundadır (#6F82FF), taslakta daha açık bir mavi (#8FA0FF). Kullanıcı kararının sonucudur.

## Neden

- Rozet Canlı Çarşı'da ve Yumuşak Mevsim'de ana renktir, Keskin Çizgi'de sabit sarıdır. Ana renk mağaza sahibinin ayarıdır, renk kopyalansaydı mağaza sahibi ana rengi değiştirince rozet eski renkte kalırdı. Bağ, değişkenle bunu tek yerde çözer.
- Okunurluk bağları çözmeden ölçseydi mağaza sahibinin seçtiği bir ana renk düğmede okunur ama bağlantıda okunmaz kalırdı.
- Başlık biçimini her başlığa sınıf olarak yazmak 20'den fazla dosyaya dokunurdu ve yeni başlık unutulabilirdi. `font-baslik`'e bağlı temel kural, başlık yazı tipini alan her yazıya kendiliğinden uygulanır. Temel katmanda olduğu için bir öğe kendi sınıfıyla geçebilir.

## Düşünülen diğer yollar

- **Yeni renkleri `renkler` listesine kendi renkleriyle eklemek:** Daha az kod, ama ana renge bağlı rozet mağaza sahibinin rengini izlemezdi.
- **Her bileşene tema adına göre sınıf yazmak** (`tema === "keskin" ? "uppercase" : ""`): Siteye ve temaya özel kodu bileşene sokardı, kural 1'e aykırıdır.
- **Bağlantıları temanın kendi renginde bırakmak:** Ana renk seçimine yeni kısıt getirmezdi. Kullanıcı ana rengi izlemesini seçti.
- **Bölüm aralığını ve kart boşluğunu sabit ölçekten temanın seçeceği bir adıma bağlamak:** Ölçek dışı 56 ve 80 px yazılamazdı.

## Sonuçları

- Tasarım değerlerinde dört yeni alan var. Siteye özel her tema dosyası bunları yazmalıdır (bugün hiçbir sitede yok, test örnekleri güncellendi).
- Yumuşak Mevsim'de ve Keskin Çizgi'de mağaza sahibinin ana renk seçimi daralır: ana renk hem düğmede hem bağlantı olarak okunur olmalıdır. Ana rengin üstündeki yazı koyu olan bir temada vurgu ana renge bağlansaydı, iki koşulu birden sağlayan ton olmayabilirdi (testte ölçüldü). Bugünkü iki temada ana rengin üstündeki yazı beyazdır, iki koşul aynı yöne gider.
- Yumuşak Mevsim'de beş ürünlü vitrin geniş ekranda dört ve bir olarak iki sıraya yerleşir.
- Başlık biçimi her başlığa uygulanır: Keskin Çizgi'de ürün sayfasının ve açıklamanın başlıkları da büyük harflidir.
