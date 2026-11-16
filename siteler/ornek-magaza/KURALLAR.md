# Örnek Mağaza

İlk demo sitesi (karar 0007).

- Her yeni özellik ve her yeni çekirdek sürümü önce burada denenir.
- Gerçek satış yapılmaz, gerçek ödeme alınmaz. Site arama motorlarına kapalıdır.
- Mağaza sahibi hesabı ve yurt dışı aktarım belgeleri gerekmez, site kimseye teslim edilmez.
- Ürünler sahtedir: Giyim, Ev ve Yaşam, Elektronik Aksesuar, Spor ve Outdoor, Kişisel Bakım (`planlar/site-ayarlari.md`, kart 0115).

## Örnek ürünler (kart 0084)

Ürünler `baslangic/katalog.json` dosyasındadır, katalog hiç kurulmamışsa arka plan süreci açılırken bir kez yüklenir. Basic Tişört, Kapüşonlu Sweatshirt, Koşu Ayakkabısı ve Keten Gömlek dışındakiler basit üründür. Fiyatların hepsi KDV dahildir ve %20 sınıfındadır. Her durumu `testler/katalog.test.ts` gerçek veritabanıyla dener; zaman testte sabit verilir.

| Durum | Ürün | Nasıl |
|---|---|---|
| Yayında, sıradan | Keten Masa Örtüsü | 449,90, stok 15 |
| Tükenmiş | Pamuklu Bez Çanta | 129,90, stok 0: satılmaz; listede görünür, tükenen ürün gizlenirse yalnız sayfası açılır |
| Birden çok kategoride | Pamuklu Bez Çanta | Giyim ve Ev ve Yaşam |
| Taslak | Yün Atkı | 349,90, stok 10, vitrinde görünmez |
| Zamanlanmış | Yılbaşı Kupa Seti | 399,90, stok 20, 1 Aralık 2026 00:00'da (İstanbul) yayına girer |
| Gizli | Hediye Paketleme | Listede yok, sayfası bağlantıyla açılır; kategorisi yok |
| Stok takibi kapalı | Hediye Paketleme | 49,90, her zaman satılabilir |
| Kargo gerektirmez | Hediye Paketleme | Kargo gerektirmeyen tek ürün |
| Düşük stoklu | USB-C Şarj Kablosu 1 m | 149,90, stok 2: genel eşik 5, müşteriye "Son 2 ürün" |
| Tarihli indirim | Kablosuz Kulaklık | 1.299,00, 8 Aralık 2026 00:00'a kadar 999,00, stok 8. İndirimden önce fiyat geçmişi olmadığı için eski fiyat görünmez (karar 0067) |
| Markası ve etiketleri olan | Kablosuz Kulaklık | Marka Örnek Ses (uydurma ad), etiketler kablosuz ve yeni |
| En az ve en çok alım adedi | Porselen Kupa | 189,90, stok 40, en az 2, en çok 6 |
| Elle seçilmiş ilgili ürün | Porselen Kupa | Keten Masa Örtüsü ve Yılbaşı Kupa Seti; Kupa Seti yayına girene kadar atlanır |

Tarihler gerçektir: 1 Aralık 2026'dan sonra Kupa Seti yayındadır, 8 Aralık 2026'dan sonra demoda indirim görünmez.

## Varyantlı ürünler ve özellikler (kart 0100)

Katalog biçimi karar 0074'tedir. Her durumu `testler/katalog.test.ts` dener.

| Durum | Ürün | Nasıl |
|---|---|---|
| İki seçenekli ürün | Basic Tişört | Beden S, M, L, XL × Renk Siyah, Beyaz: 8 birleşim, her biri kendi stok koduyla (`ORN-GYM-003-<beden>-<renk>`) |
| Birleşime göre fiyat | Basic Tişört | 299,90; XL bedenler 329,90. Fiyat aralığı 299,90–329,90 |
| Tükenmiş birleşim | Basic Tişört | M Beyaz stok 0, öteki birleşimler 10; ürünün geneli satılabilir |
| Birleşime göre tarihli indirim | Kapüşonlu Sweatshirt | Beden S, M, L × Renk Gri, Lacivert, 6'şar adet, 649,90. Lacivert birleşimler 16 Kasım 2026 18:00'den 8 Aralık 2026 00:00'a kadar (İstanbul) 549,90; Gri indirimsiz. Katalog 16 Kasım 18:00'den önce kurulursa üstü çizili 649,90 görünür (karar 0067, 0074) |
| Birleşimin kendi görseli | Basic Tişört, Kapüşonlu Sweatshirt | Her renk kendi görselini gösterir |

Özellikler:

| Özellik | Tür | Basic Tişört | Kapüşonlu Sweatshirt | Keten Masa Örtüsü |
|---|---|---|---|---|
| Kumaş | Liste: Pamuk, Polyester, Keten | Pamuk | Pamuk | Keten |
| Gramaj | Sayı, g/m² | 180 | 320 | — |
| Makinede yıkanabilir | Evet/hayır | Evet | Evet | Evet |
| Bakım notu | Metin | 30 derecede ters yıkayın | Pamuk ve polyester karışımıdır. Kurutma makinesine atmayın. | — |

Kumaş tek seçimlidir (kullanıcı kararı): sweatshirtin karışımı bakım notunda yazar. Kumaş vitrin filtresinde kullanılır (karar 0102, kart 0136); öteki özellikler filtrede değildir.

## Görseller ve video (kart 0087)

Görseller `baslangic/gorseller/` klasöründedir, katalogdaki ürünün `galeri` alanı onları adıyla sıralar. Katalog kurulurken dosya deposuna yüklenir, her birinin dört boyutu üretilir. Durumları `testler/katalog.test.ts` dener.

| Durum | Ürün | Nasıl |
|---|---|---|
| Tek görsel | USB-C Şarj Kablosu 1 m, Hediye Paketleme | Ana görsel o görseldir |
| Birden çok görsel | Yukarıdakiler dışındakiler | Önce stüdyo, sonra ortam görseli |
| Videolu galeri | Kablosuz Kulaklık | İki görsel, ikinci sırada YouTube videosu; ana görsel ilk görseldir |
| Renge göre görsel | Basic Tişört, Kapüşonlu Sweatshirt | Her rengin bir görseli; birleşim kendi renginin görselini seçer (kart 0100) |

**Kaynaklar:**

- Görseller kullanıcının verdiği paketten gelir (kart 0115): eğitimdeki Örnek Mağaza'nın örnek ürünleri için yapay zekâyla üretilmiş JPEG dosyaları. Paketin notuna göre yalnız bu deneme mağazasında kullanılır, gerçek bir mağazada kullanılmaz.
- Kullanılmayan dosyalar: `baslangic/bekleyen-gorseller/` klasöründeki üç blog görseli blog özelliği gelene kadar bekler, hiçbir başlangıç dosyası onlara başvurmaz.
- Video: "Big Buck Bunny", Blender Foundation, Creative Commons Attribution 3.0 lisanslı (https://peach.blender.org). YouTube'da Blender'ın resmî kanalındaki yükleme: https://www.youtube.com/watch?v=aqz-KE-bpKQ (2026-11-08'de YouTube'un oEmbed yanıtıyla var olduğu doğrulandı). Ürünle ilgisi yoktur, yalnız galeride videonun nasıl göründüğünü göstermek içindir. Lisansın istediği atıf alternatif metindedir.

## Yeni ürünler (kart 0115)

Her durumu `testler/katalog.test.ts` dener. Fiyatlar KDV dahildir.

| Durum | Ürün | Nasıl |
|---|---|---|
| Basit ürün | Yoga Matı 6 mm, Spor Çorap Seti (3'lü), Ahşap Saç Fırçası, Seramik Saksı, Kablosuz Şarj Standı | 549,90 stok 12; 149,90 stok 50; 219,90 stok 25; 279,90 stok 18; 399,90 stok 22 |
| Düşük stoklu | Kokulu Mum | 249,90, stok 3: müşteriye "Son 3 ürün" |
| Tarihli indirim | Çelik Termos 750 ml, Zeytinyağlı Sabun Seti (3'lü), Bluetooth Hoparlör | 429,90'dan 349,90; 179,90'dan 149,90; 899,90'dan 749,90. 16 Kasım 2026 18:00'den 8 Aralık 2026 00:00'a kadar (İstanbul). Stok 20, 30, 15 |
| Beden seçenekli, tükenmiş beden | Koşu Ayakkabısı | 39–43, 1.499,90, her bedenden 4, 42 tükenmiş |
| Beden seçenekli | Keten Gömlek | S, M, L, XL, 799,90, her bedenden 5 |
| Markalı | Bluetooth Hoparlör, Kablosuz Şarj Standı | Örnek Ses |

Her kategorinin görseli vardır.

## Yorumlar (kart 0139)

Örnek yorumlar `baslangic/katalog.json` dosyasında ürünlerin `yorumlar` alanındadır ve katalogla birlikte bir kez yüklenir: yayında, müşterisiz, doğrulanmış alıcı değil (kullanıcı kararı: etiket demoda da yanıltıcı olur). Adlar uydurmadır, vitrinde soyadı kısaltılır ("Elif K."). "Yalnız satın alanlar yorum yapabilir" bu sitede kapalıdır: giriş yapmış her müşteri yorum yazar, yorum onaydan sonra yayınlanır (karar 0101). Her durumu `testler/katalog.test.ts` gerçek veritabanıyla dener.

| Durum | Ürün | Nasıl |
|---|---|---|
| Üç yorum, ortalama 4,7 | Basic Tişört | 5, 4, 5 |
| İki yorum | Kablosuz Kulaklık, Koşu Ayakkabısı | 4 ve 3; 5 ve 4 |
| Tek yorum | Keten Gömlek, Çelik Termos 750 ml, Kokulu Mum, Yoga Matı 6 mm | 5, 5, 4, 5 |
| Başlıksız yorum | Basic Tişört, Kablosuz Kulaklık, Koşu Ayakkabısı, Çelik Termos 750 ml, Yoga Matı 6 mm | Yalnız metin |
| Ana sayfada gösterilen | Basic Tişört, Kablosuz Kulaklık, Koşu Ayakkabısı | Her birinin ilk yorumu; ana sayfanın "Müşterilerimiz ne diyor" bölümü bunları gösterir |
| Yorumsuz ürün | Öteki ürünler | Ürün sayfasında "İlk yorumu siz yazın", kartta beş boş yıldız |

## Menüler (kart 0107)

Menüler `baslangic/menuler.json` dosyasındadır. Arka plan süreci açılırken, katalogdan sonra, sitede hiç menü yoksa bir kez yüklenir. Her durumu `testler/menuler.test.ts` gerçek veritabanıyla dener; zaman testte sabit verilir.

| Durum | Menü | Nasıl |
|---|---|---|
| Kategoriye bağlı, adını kategoriden alır | Ana menü | Giyim, Ev ve Yaşam, Elektronik Aksesuar, Spor ve Outdoor, Kişisel Bakım |
| Açılır alt öğe (ürün) | Ana menü | Elektronik Aksesuar'ın altında Kablosuz Kulaklık |
| Bağlantısız başlık ve marka | Ana menü | "Markalar" başlığının altında Örnek Ses |
| Açılmayan ürün görünmez | Ana menü | "Yılbaşı" Yılbaşı Kupa Seti'ne bağlı: 1 Aralık 2026 00:00'a (İstanbul) kadar görünmez, panelde işaretlidir |
| Kategori ağacından kendiliğinden | Kategori menüsü | Kategoriler kendi sırasıyla, ad değişince menü de değişir |
| Alt bilgi sütunları | Alt bilgi | "Alışveriş" (beş kategori ve Hediye Paketleme), "Sözleşmeler" (üyelik sözleşmesi ve KVKK aydınlatma metni, sitenin kendi adresleri) |
| Gizli ürün görünür | Alt bilgi | Hediye Paketleme listede yok ama sayfası açılır: menüdeki bağlantısı görünür |

## Tema ve başlangıç düzeni (kart 0114)

Örnek Mağaza üç hazır temayı kullanabilir (`ayarlar.json`): Canlı Çarşı, Yumuşak Mevsim, Keskin Çizgi. Başlangıç teması Canlı Çarşı'dır (`baslangic/tema.json`, karar 0075).

Ana sayfanın ilk düzeni `baslangic/duzen.json` dosyasındadır, sırası karar 0075'tedir. Kategori, marka ve ürünlere adres adıyla bağlanır. Arka plan süreci açılırken, katalogdan ve menülerden sonra, sitede hiç düzen yoksa bir kez yüklenir. Her durumu `testler/duzen.test.ts` gerçek veritabanıyla dener.

| Durum | Bölüm | Nasıl |
|---|---|---|
| Üst kısımda duyuru | Duyuru şeridi | "Yeni sezon ürünleri mağazada", Giyim kategorisine bağlantı |
| Ayardan dolan madde | Güven şeridi | "{kargoyaVermeSuresi} iş gününde kargoda": mağaza ayarındaki sayı görünür (başlangıçta 1) |
| Elle seçilmiş ürünler | Öne çıkanlar (ürün vitrini) | Kablosuz Kulaklık, Kapüşonlu Sweatshirt, Basic Tişört, Keten Masa Örtüsü, Porselen Kupa; yan afişsiz, tam genişlikte (kart 0170, kullanıcı kararı: "Süreli fırsatlar" yan afişi ürünlerle çelişiyordu, taslaktaki gibi beş ürün) |
| Yan afişli ürün vitrini | Yeni gelenler | En yeni 4 ürün, solda yan afiş (masaüstünde tek sıra). Katalog tek işlemde yazılır, en yeni kataloğun son ürünüdür: Keten Gömlek, Kablosuz Şarj Standı, Bluetooth Hoparlör, Kokulu Mum (kart 0127) |
| Kategoriye göre sekmeler | Sekmeli vitrin | Beş kategori; kartlar yatay |
| Geri sayımlı fırsat | Fırsatlar | Eski fiyatı gösterilen, bitişli indirimdeki ürünler, en çok dört: 16 Kasım 18:00–8 Aralık 2026 arası Kapüşonlu Sweatshirt (lacivert), Çelik Termos, Zeytinyağlı Sabun Seti, Bluetooth Hoparlör. Katalog 16 Kasım 18:00'den önce kurulmuş olmalı (karar 0094). Kablosuz Kulaklık'ın eski fiyatı gösterilmediği için girmez (karar 0088). Fırsat yokken bölüm vitrinde çizilmez |
| İşlevi yazılmamış bölüm | Müşteri yorumları, blog yazıları, bülten kaydı | Düzende durur, vitrinde çizilmez (karar 0090) |
| Görselli bölümler | Kayan afiş (görsel arkada), kampanya afişleri (üçlü yatay ve ikili "görsel solda", karar 0093), kategori kutuları, geniş afiş (tam genişlik), yeni gelenlerin yan afişi | Görseller `baslangic/gorseller/` klasöründen dosya adıyla (karar 0094) |
| Logosu gelmemiş bölüm gizli | Marka logoları | Pakette logo yok, gizli kaldı |

Güven şeridine ücretsiz kargo ve ödeme yöntemi yazılmadı: kargo hesabı ve ödeme yazılmadan ekrana iddia olarak konmaz.
