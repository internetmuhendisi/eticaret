# Örnek Mağaza

İlk demo sitesi (karar 0007).

- Her yeni özellik ve her yeni çekirdek sürümü önce burada denenir.
- Gerçek satış yapılmaz, gerçek ödeme alınmaz. Site arama motorlarına kapalıdır.
- Mağaza sahibi hesabı ve yurt dışı aktarım belgeleri gerekmez, site kimseye teslim edilmez.
- Ürünler sahtedir: Giyim, Ev ve Yaşam, Elektronik Aksesuar (`planlar/site-ayarlari.md`).

## Örnek ürünler (kart 0084)

Ürünler `baslangic/katalog.json` dosyasındadır, katalog hiç kurulmamışsa arka plan süreci açılırken bir kez yüklenir. Basic Tişört ve Kapüşonlu Sweatshirt dışındakiler basit üründür. Fiyatların hepsi KDV dahildir ve %20 sınıfındadır. Her durumu `testler/katalog.test.ts` gerçek veritabanıyla dener; zaman testte sabit verilir.

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
| Tarihli indirim | Kablosuz Kulaklık | 1.299,00, 1 Aralık 2026 00:00'a kadar 999,00, stok 8. İndirimden önce fiyat geçmişi olmadığı için eski fiyat görünmez (karar 0067) |
| Markası ve etiketleri olan | Kablosuz Kulaklık | Marka Örnek Ses (uydurma ad), etiketler kablosuz ve yeni |
| En az ve en çok alım adedi | Porselen Kupa | 189,90, stok 40, en az 2, en çok 6 |
| Elle seçilmiş ilgili ürün | Porselen Kupa | Keten Masa Örtüsü ve Yılbaşı Kupa Seti; Kupa Seti yayına girene kadar atlanır |

Tarihler gerçektir: 1 Aralık 2026'dan sonra demoda indirim görünmez, Kupa Seti yayındadır.

## Varyantlı ürünler ve özellikler (kart 0100)

Katalog biçimi karar 0074'tedir. Her durumu `testler/katalog.test.ts` dener.

| Durum | Ürün | Nasıl |
|---|---|---|
| İki seçenekli ürün | Basic Tişört | Beden S, M, L, XL × Renk Siyah, Beyaz: 8 birleşim, her biri kendi stok koduyla (`ORN-GYM-003-<beden>-<renk>`) |
| Birleşime göre fiyat | Basic Tişört | 299,90; XL bedenler 329,90. Fiyat aralığı 299,90–329,90 |
| Tükenmiş birleşim | Basic Tişört | M Beyaz stok 0, öteki birleşimler 10; ürünün geneli satılabilir |
| Birleşime göre tarihli indirim | Kapüşonlu Sweatshirt | Beden S, M, L × Renk Gri, Lacivert, 6'şar adet, 649,90. Lacivert birleşimler 15 Kasım 2026 00:00'dan 1 Aralık 2026 00:00'a kadar (İstanbul) 549,90; Gri indirimsiz. Katalog 15 Kasım'dan önce kurulursa üstü çizili 649,90 görünür (karar 0067, 0074) |
| Birleşimin kendi görseli | Basic Tişört, Kapüşonlu Sweatshirt | Her renk kendi görselini gösterir |

Özellikler:

| Özellik | Tür | Basic Tişört | Kapüşonlu Sweatshirt | Keten Masa Örtüsü |
|---|---|---|---|---|
| Kumaş | Liste: Pamuk, Polyester, Keten | Pamuk | Pamuk | Keten |
| Gramaj | Sayı, g/m² | 180 | 320 | — |
| Makinede yıkanabilir | Evet/hayır | Evet | Evet | Evet |
| Bakım notu | Metin | 30 derecede ters yıkayın | Pamuk ve polyester karışımıdır. Kurutma makinesine atmayın. | — |

Kumaş tek seçimlidir (kullanıcı kararı): sweatshirtin karışımı bakım notunda yazar.

## Görseller ve video (kart 0087)

Görseller `baslangic/gorseller/` klasöründedir, katalogdaki ürünün `galeri` alanı onları adıyla sıralar. Katalog kurulurken dosya deposuna yüklenir, her birinin dört boyutu üretilir. Durumları `testler/katalog.test.ts` dener.

| Durum | Ürün | Nasıl |
|---|---|---|
| Tek görsel | Yün Atkı, Keten Masa Örtüsü, Porselen Kupa, Yılbaşı Kupa Seti, USB-C Şarj Kablosu 1 m | Ana görsel o görseldir |
| Birden çok görsel | Pamuklu Bez Çanta | İki görsel, sırasıyla |
| Videolu galeri | Kablosuz Kulaklık | Üç görsel, ikinci sırada YouTube videosu; ana görsel ilk görseldir |
| Görselsiz ürün | Hediye Paketleme | Ana görseli yok |
| Renge göre görsel | Basic Tişört, Kapüşonlu Sweatshirt | Her rengin bir görseli; birleşim kendi renginin görselini seçer (kart 0100) |

**Kaynaklar:**

- Görseller projede üretildi (kullanıcı kararı): 1600 × 1600 piksel, yazısız PNG. Her biri açık renkli düz bir zemin üzerine ürünü andıran basit bir biçimdir (çanta, şerit, kare, kupa, kulaklık, daire, kablo; kart 0100 ile tişört ve kapüşonlu). SVG olarak çizilip `sharp` ile PNG'ye çevrildi. Telif ya da lisans gerektirmez.
- Video: "Big Buck Bunny", Blender Foundation, Creative Commons Attribution 3.0 lisanslı (https://peach.blender.org). YouTube'da Blender'ın resmî kanalındaki yükleme: https://www.youtube.com/watch?v=aqz-KE-bpKQ (2026-11-08'de YouTube'un oEmbed yanıtıyla var olduğu doğrulandı). Ürünle ilgisi yoktur, yalnız galeride videonun nasıl göründüğünü göstermek içindir. Lisansın istediği atıf alternatif metindedir.

## Menüler (kart 0107)

Menüler `baslangic/menuler.json` dosyasındadır. Arka plan süreci açılırken, katalogdan sonra, sitede hiç menü yoksa bir kez yüklenir. Her durumu `testler/menuler.test.ts` gerçek veritabanıyla dener; zaman testte sabit verilir.

| Durum | Menü | Nasıl |
|---|---|---|
| Kategoriye bağlı, adını kategoriden alır | Ana menü | Giyim, Ev ve Yaşam, Elektronik Aksesuar |
| Açılır alt öğe (ürün) | Ana menü | Elektronik Aksesuar'ın altında Kablosuz Kulaklık |
| Bağlantısız başlık ve marka | Ana menü | "Markalar" başlığının altında Örnek Ses |
| Açılmayan ürün görünmez | Ana menü | "Yılbaşı" Yılbaşı Kupa Seti'ne bağlı: 1 Aralık 2026 00:00'a (İstanbul) kadar görünmez, panelde işaretlidir |
| Kategori ağacından kendiliğinden | Kategori menüsü | Kategoriler kendi sırasıyla, ad değişince menü de değişir |
| Alt bilgi sütunları | Alt bilgi | "Alışveriş" (üç kategori ve Hediye Paketleme), "Sözleşmeler" (üyelik sözleşmesi ve KVKK aydınlatma metni, sitenin kendi adresleri) |
| Gizli ürün görünür | Alt bilgi | Hediye Paketleme listede yok ama sayfası açılır: menüdeki bağlantısı görünür |

## Tema ve başlangıç düzeni (kart 0114)

Örnek Mağaza üç hazır temayı kullanabilir (`ayarlar.json`): Canlı Çarşı, Yumuşak Mevsim, Keskin Çizgi. Başlangıç teması Canlı Çarşı'dır (`baslangic/tema.json`, karar 0075).

Ana sayfanın ilk düzeni `baslangic/duzen.json` dosyasındadır, sırası karar 0075'tedir. Kategori, marka ve ürünlere adres adıyla bağlanır. Arka plan süreci açılırken, katalogdan ve menülerden sonra, sitede hiç düzen yoksa bir kez yüklenir. Her durumu `testler/duzen.test.ts` gerçek veritabanıyla dener.

| Durum | Bölüm | Nasıl |
|---|---|---|
| Üst kısımda duyuru | Duyuru şeridi | "Yeni sezon ürünleri mağazada", Giyim kategorisine bağlantı |
| Ayardan dolan madde | Güven şeridi | "{kargoyaVermeSuresi} iş gününde kargoda": mağaza ayarındaki sayı görünür (başlangıçta 1) |
| Elle seçilmiş ürünler | Öne çıkanlar (ürün vitrini) | Kablosuz Kulaklık, Kapüşonlu Sweatshirt, Basic Tişört, Keten Masa Örtüsü, Porselen Kupa |
| Yan afişli ürün vitrini | Yeni gelenler | En yeni 4 ürün, solda yan afiş (masaüstünde tek sıra) |
| Kategoriye göre sekmeler | Sekmeli vitrin | Giyim, Ev ve Yaşam, Elektronik Aksesuar; kartlar yatay |
| Geri sayımlı fırsat | Fırsatlar | Eski fiyatı gösterilen, bitişli indirimdeki ürünler: 15 Kasım–1 Aralık 2026 arası Kapüşonlu Sweatshirt (lacivert). Kablosuz Kulaklık'ın eski fiyatı gösterilmediği için girmez (karar 0088). Fırsat yokken bölüm vitrinde çizilmez |
| İşlevi yazılmamış bölüm | Müşteri yorumları, blog yazıları, bülten kaydı | Düzende durur, vitrinde çizilmez (karar 0090) |
| Görseli gelmemiş bölüm gizli | Kayan afiş, kampanya afişleri (üçlü ve ikili), kategori kutuları, geniş afiş, marka logoları | Metni ve bağlantısı yazılı, görsel paketi gelene kadar gizli (kart 0115) |

Güven şeridine ücretsiz kargo ve ödeme yöntemi yazılmadı: kargo hesabı ve ödeme yazılmadan ekrana iddia olarak konmaz.
