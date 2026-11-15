# 0129 · Panelin tema ekranı: demo bağlantısı, düzen sorusu, filtrenin yeri

## Tarih

2026-11-15

## Karar

Panelde "Tema" ekranı (kart 0148) sitenin kullanabileceği temaları kart kart gösterir. Her kartta temanın adı, seçiliyse "Kullanılıyor" işareti, "Demoyu gez" bağlantısı ve "Bu temayı kullan" düğmesi vardır. Ekranın altında masaüstünde ürün listesinin filtresinin yeri seçilir. Komut çubuğunda "Önceki hâline dön" durur.

- **Demo bağlantısı:** Tema Galerisi'nin (karar 0127) adresine `?tema=<kod>` ekler, yeni sekmede açılır. Siteye özel temanın demosu yoktur, kartında nedeni yazar.
  - Adresin tek kaynağı demo sitesinin kimliğidir. Demo sitesi türü `demo` olan ve `temaDemosu` ayarı açık sitedir.
  - Komutlar (yayın, yerel ortam, tarayıcı testleri) adresi `komutlar/tema-demosu-adresi.mts` ile bulur ve her sitenin kutusuna `TEMA_DEMOSU_ADRESI` ortam değişkeniyle verir. Canlıda demonun canlı adresi kullanılır, yoksa deneme adresi; deneme ortamında deneme adresi.
  - Birden çok demo sitesi varsa komut durur. Adres yoksa ya da yalnız http/https kök adres değilse bağlantı çizilmez.
- **"Bu temayı kullan":** Bir pencere açılır ve vitrin bölümlerinin yolunu sorar (kart 0113): yeni temanın düzenini uygulamak ya da bugünkü düzeni korumak. Seçim yapılmadan yayınlanmaz. Pencerede varsayılan seçim yoktur.
- **Ayarların taşınması:** Yeni temaya geçerken mağaza sahibinin ayarlarından yeni temanın kabul etmediği renk ve seçenek atılır (okunmayan renk de), gerisi kalır (`yeniTemaninAyarlari`). Koyu tema ve filtrenin yeri temaya bağlı değildir, her zaman kalır.
- **Filtrenin yeri:** Mağaza sahibinin tema ayarıdır (`urunFiltresi`: `solda` ya da `ustte`). Seçilmemişse temanın görünümü geçerlidir. Vitrin parça görünümlerini yalnız `parcaGorunumleriniKur` ile okur. Seçim de bir tema sürümüdür, "Önceki hâline dön" onu da geri alır.
- **Geri dönüş:** Ekran gördüğü son sürümün sırasını gönderir (`son`). Arada başka bir değişiklik yazıldıysa uç `cakisma` (`tema-degisti`) döner, hiçbir şey yazılmaz. Bu, karar 0115'teki düzen kuralının aynısıdır.
- **Yetki:** Ekranı `tema.gor` izni olan görür. Değiştiren düğmeler yalnız `tema.degistir` izni olana ve "Mağaza sahibi temayı değiştirebilir" açıkken görünür. Ayar kapalıysa nedeni yazar; demo bağlantıları kalır.
- **Tarayıcı testi ayrı aşamada:** Tema bütün vitrinin görünüşünü değiştirir. Bu yüzden tema ekranının tarayıcı testi öteki tarayıcı testleri bittikten sonra kendi aşamasında çalışır (`playwright.config.ts`, `tema-degisikligi`). Sonunda tema testten önceki sürüme döndürülür.

## Neden

- Çekirdekte site adı geçmez (karar 0021, `site-adi-yok.test.ts`). Sitenin kutusu yalnız kendi klasörünü görür. Bu yüzden demonun adresi ancak dışarıdan verilebilir. Değeri kimlikten komutların üretmesi adresi tek yerde tutar.
- Düzen sorusunda varsayılan seçim olmaması, mağaza sahibinin düzeninin farkında olmadan değişmesini önler. Kart iki yolun "sorulmasını" ister.
- Renk ve seçenekler temaya bağlıdır: yeni temanın açmadığı bir değer yayını reddettirirdi. Koyu tema ve filtrenin yeri mağazanın tercihidir, tema değişince kaybolmamalıdır.
- Filtrenin yerini tema ayarına koymak, onu temanın sürümleriyle birlikte saklar ve geri alır. Ayrı bir mağaza ayarı olsaydı ikinci bir geçmiş ve ikinci bir geri dönüş yolu gerekirdi.
- Tema değişikliği öteki tarayıcı testleriyle aynı anda çalışsaydı, onların ölçtüğü renkleri ve görünümü değiştirirdi.

## Düşünülen diğer yollar

- **Demo adresini her sitenin `ayarlar.json`'ına yazmak:** Ek komut gerekmezdi. Ama aynı adres her sitede ayrı yazılır ve zamanla ayrışırdı. Seçilmedi.
- **Demo adresini çekirdeğe yazmak:** Çekirdekte site adı ve alan adı geçerdi. Seçilmedi.
- **Düzen sorusunda "uygula"nın seçili gelmesi:** Bir tık daha az olurdu. Ama mağaza sahibinin bölümleri sorulmadan yeni temanın sırasına geçerdi. Seçilmedi.
- **Yeni temaya geçerken bütün ayarları atmak:** Kural daha basit olurdu. Ama koyu tema ve filtrenin yeri her tema değişikliğinde kaybolurdu. Seçilmedi.
- **Filtrenin yerini mağaza ayarı yapmak (`magazaAyarSemasi`):** Öteki liste ayarlarının yanında dururdu. Ama `planlar/site-ayarlari.md` onu tema ayarı olarak tanımlar ve vitrin onu temanın parça görünümü olarak okur. Seçilmedi.

## Sonuçları

- Yeni bir ortam değişkeni (`TEMA_DEMOSU_ADRESI`) site kutusunun tanımına girer. Sunucudaki kutular bir sonraki yayında bu değişkeni alır. Eski yayında demo bağlantısı yoktur.
- Demo sitesi sunucuya kurulana kadar bağlantı açılmayan bir adrese gider. Demonun kurulumu ayrı bir adımdır (karar 0127).
- Yayın komutu demo sitesini çalışma klasöründeki `siteler/`'den okur, yayınlanan kayıttan değil. Demonun kimliğindeki adres kayıtla farklıysa çalışma klasöründeki geçer.
- Tema ekranının tarayıcı testi öteki tarayıcı testleri yeşil bitmezse çalışmaz: Playwright bağımlı aşamayı atlar ve "did not run" yazar. Yalnız bu dosyayı çalıştırmak için `--no-deps` gerekir. Bugün iki katalog testi hattın koşulunda ana dalda da düşebiliyor (kart 0204); düştüklerinde tema aşaması da çalışmaz.
- Mağaza sahibinin seçtiği filtre yeri, temanın kendi görünümünü kalıcı olarak geçersiz kılar. "Temanın seçimine dön" diye ayrı bir seçenek yoktur, geri dönüş tema sürümüyle yapılır.
