# 0172 · Panel, bugün boş olduğu için vitrinde görünmeyen bölümü söylesin

## Amaç

Müşteri gezisinde (2026-11-13) görüldü: "Geri sayımlı fırsatlar" panelde görünür işaretli, ama vitrinde yok, çünkü bugün bitiş tarihli süren indirim yok. Panel blog ve bülten bölümlerinde nedeni yazıyor ("Vitrinde görünmüyor"), bu bölümde hiçbir şey söylemiyor; mağaza sahibi bölümün neden görünmediğini anlamaz.

## Olmazsa olmazlar

- Vitrinde içeriği boş kaldığı için çizilmeyen her bölüm (fırsatlar, ürün vitrini, sekmeli vitrin, marka logoları, yorumlar gibi) panelde "Şu an vitrinde görünmüyor" işaretini ve bölüme göre nedenini alır (örneğin "Bitiş tarihli süren indirim yok; indirim girilince görünür.").
- Boşluk vitrinin kullandığı kaynakla aynı sorgudan bulunur; iki ayrı kural yazılmaz.
- Gerçek veritabanıyla test: boş kaynakta işaret var, ürün gelince yok; tarayıcıda işaret görünüyor.

## Sınırlar

- Bölümün kendisi ve vitrindeki davranışı değişmez.

## Bitti sayılır

- Bitiş tarihli indirim yokken "Geri sayımlı fırsatlar" panelde nedeniyle işaretli (test).
- Önce ve sonra ekran görüntüsü karşılaştırıldı.

## Notlar (2026-11-14)

- Tek kural: her türün görünüşü öğelerini dışa açılan bir işlevle hesaplar (`firsatKartlari`, `urunVitriniKartlari`, `sekmeliVitrinSekmeleri` gibi), boşluk kaydı (`bolumBosluklari`) onları kullanır; panel verisi vitrinin bağlamını vitrinle aynı okumayla (`vitrinBaglaminiOku`) okur. 14 tür kayıtta: menü satırı, bağlantı sütunları, iletişim, sosyal hesaplar, ödeme işaretleri, güven şeridi, kategori kutuları, ürün vitrini, sekmeli vitrin, fırsatlar, marka logoları, yorumlar, blog, bülten. Kayan afiş, kampanya ve geniş afişin boşluğu yalnız değerlere bağlıdır, şema boşu kabul etmez.
- Önce ve sonra görüntüsü (taze Örnek Mağaza, indirimler 15 Kasım'da başlıyor): önce "Geri sayımlı fırsatlar" panelde işaretsiz, vitrinde yok; sonra "Vitrinde görünmüyor" rozeti ve "Şu an vitrinde görünmüyor: bitiş tarihi olan, süren bir indirim yok. Bitiş tarihli indirim girilince görünür."
- Ölçülen sınır: fırsatlarda boş kartı `FirsatSaati` de çizmez (ikinci katman); görünüşün koşulu tek başına bozulunca test yeşil kaldı. Ürün vitrini ve marka logolarında aynı bozma kırmızıya düştü.
- Tam tarayıcı takımında (yük ortalaması 20–25) iki test düştü, bu karttan bağımsız: sıralanabilir liste (animasyon sırasında ölçüm, kart 0165) ve yavaş işlemcide yan pencere (60 saniye sınırı aşıldı, yük altı süre kartlarıyla aynı sınıf). İkisi tek başına üçer kez geçti.
- Bağımsız kontrolün bulgularıyla düzeltildi: vitrinin bağlamı okunamazsa (bozuk mağaza ayarı gibi) vitrin bölümleri ekranı ve Slider sayfası düşüyordu; artık hata kaydedilir, ekran boşluk bilgisi olmadan açılır. Fırsatların gerçek boş hâli (kartı olup bitişi olmayan kaynak) birim testinde, bitişsiz ve bitişli indirim gerçek veritabanıyla testte. Bülten görünüşü boşluk işlevini kullanır. Düzen ucunun `cizilir` alanının boşluğu kapsamadığı uç belgesinde.
- "Bitti sayılır"daki "Geri sayımlı fırsatlar panelde nedeniyle işaretli" maddesi: kural (boşluk kaydı) gerçek veritabanıyla fırsatlarda ölçülür, panelin işareti tarayıcıda bağlantı sütunlarıyla ölçülür (paylaşılan veritabanında fırsatların durumu tarihe bağlıdır). Fırsatların panelde işaretli göründüğü önce-sonra görüntüsüyle bir kez görüldü.

## Durum

yapılacak
