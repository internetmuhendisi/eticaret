# 0204 · Demolar ekranı ve demo içe aktarmanın ürün kararları

## Tarih

2026-11-28

## Karar

Panelin Demolar ekranının ve demo içe aktarmanın taslağı `planlar/tasarim-yonu/panel-3.html` dosyasıdır (kart 0346). Canlı Çarşı yönünde (karar 0075), panel taslaklarının (karar 0157, 0185) stilleri ve yardımcılarıyla şunları çizer: Demolar listesi (önizleme görseli, ad, sektör, önerilen tema, içerik sayıları, kurulu işareti, "Önizlemeye bak", son içe aktarma), içe aktarma penceresi (gelecekler ve değişmeyecekler, "örnek verileri de aktar", tema), satıştaki mağaza, ilerleme, sonuç, önceki hâline dönüş onayı, içe aktarılamadı hâli ve vitrinde "(örnek)" ekli ürün kartı ve ürün sayfası. Ekran Panel menüsünün Vitrin grubundadır. Kullanıcı taslağı onayladı; ekran kartları (0347, 0348) kendi görüntülerini bu taslakla karşılaştırır.

Kullanıcının kararları (hepsi önerilen seçenek):

| Soru | Karar |
|---|---|
| "Örnek verileri de aktar" neyi kapsar | Paketin ürünleri (görselleriyle), kategorileri, markaları, blog yazıları, sayfaları ve kuponları. İşaretsizken yalnız ana sayfa düzeni ve menüler gelir. |
| "(örnek)" eki nerede | Yalnız ürün adının sonunda. Kategori, marka, blog yazısı, sayfa ve kupon eksiz gelir. |
| Ana sayfa düzeni ve menüler | İçe aktarınca demonunkiyle yer değiştirir. Mağaza sahibinin ayarları (ad, logo, iletişim, satıcı, ödeme, kargo, vergi, e-posta metinleri, ekip), kendi eklediği ürünler, sayfalar ve menü öğeleri, siparişler, müşteriler ve yorumlar değişmez. |
| Tema | İçe aktarma penceresinde sorulur: demonun önerdiği tema ya da şimdiki tema. Temanın renk, yazı tipi ve köşe ayarları korunur. |
| Başka demoya geçiş | Önceki demonun dokunulmamış örnek verileri kaldırılır. Sipariş, yorum ya da favori almış ve mağaza sahibinin düzenlediği örnek ürünler kalır. |
| Düzenlenen örnek ürün | Örnek olma ürünün adından ayrı tutulan bir işarettir. Mağaza sahibi örnek ürünü düzenleyip kaydedince işaret kalkar: ürün mağazanın olur, geçişte ve geri dönüşte silinmez. Ek ürün adının parçasıdır, mağaza sahibi silebilir. |
| "Önceki hâline dön" | Yalnız son içe aktarmayı geri alır: ana sayfa düzeni ve menüler önceki hâline döner, o içe aktarmanın dokunulmamış örnek verileri kaldırılır. Daha önceki içe aktarmalar yerinde kalır. |
| Satıştaki mağaza | Demo örnek ürünler olmadan aktarılır (yalnız düzen ve menüler). Mağazanın satışta sayılması Açılış bölümünün satışa açılış ayarından okunur; o güne kadar hiçbir mağaza satışta sayılmaz. |
| İçe aktaran | Yalnız mağaza sahibi rolü. Öteki roller ekranı görür, düğmeleri görmez. |
| "Demoyu gez" | Önizleme görselleri: demonun ana sayfası, bir kategori ve bir ürün sayfasının görselleri pencerede. Ayrı demo sitesi yoktur. |
| Örnek ürün satılır mı | Satılır; ürün sayfasında "Bu bir örnek üründür" uyarısı durur. |
| Arama motoru | Örnek ürünün sayfası arama motorlarına kapalıdır (noindex) ve site haritasına girmez; mağaza sahibi düzenleyince ürün mağazanın olur ve açılır. |

Site ayarı olarak önerilenler (`planlar/site-ayarlari.md`): Demolar ekranı (varsayılan açık, Örnek Mağaza açık), kullanılabilecek demolar (varsayılan bütün demolar, Örnek Mağaza bütün demolar).

## Neden

- Mağaza sahibinin istediği dolu bir vitrindir; kategorisiz, blogsuz örnek ürün yarım bir vitrin verir.
- Ekin yalnız üründe olması müşterinin sepete koyabileceği şeyi işaretler; kategori ve sayfa adında ek vitrini bozar.
- Demonun asıl değeri ana sayfası ve menüleridir; yanına eklemek iki düzeni üst üste koyar. Mağazanın kendi verisine dokunulmaması "ayarlarınız korunur" sözünü tutar.
- Tema demonun görünüşünün parçasıdır ama mağaza sahibi temasını seçmiş olabilir; karar pencerede ona bırakılır.
- Dokunulmamış örneğin kalkması demolar arası geçişi temiz tutar; sipariş, yorum, favori ya da düzenleme alan ürün artık mağazanın geçmişindedir, silinirse sipariş ve yorum sahipsiz kalır.
- Düzenlemeyle sahiplenme mağaza sahibinin hiçbir ek işlem öğrenmeden ürünü kendi ürünü yapmasını sağlar.
- Son içe aktarmayı geri almak tek adımın anlaşılır karşılığıdır; ilk demoya kadar dönmek aradaki işleri beklenmedik biçimde siler.
- Satıştaki mağazaya örnek ürün gelmesi müşteriyi yanıltır; düzen ve menüler ise mağaza sahibinin bilerek değiştirebileceği görünüştür.
- Demo içe aktarma mağazanın bütün vitrinini değiştirir; bu, mağaza sahibinin kararıdır.
- Her demo için ayrı site, sunucuda her biri iki kutu ve ayrı güncelleme demektir; görseller aynı bilgiyi bedelsiz verir.
- Satılabilir örnek ürün yeni mağazanın ilk satışlarını engellemez; uyarı müşteriyi bilgilendirir.
- Örnek ürünün arama motorunda dizinlenmesi gerçek ürünler gelince kaybolan sayfalar bırakır.

## Düşünülen diğer yollar

- Örnek veri olarak yalnız ürünler: kategorisiz ürünler menüde ve ana sayfada boş yerler bırakır.
- Ekin kategori, marka ve blogda da olması: vitrinin her yerinde "(örnek)" yazar.
- Düzen ve menülerin değişmemesi: demonun ana sayfası gelmez, içe aktarma yalnız ürün eklemeye döner.
- Temanın hiç değişmemesi: demonun görünüşü önerilen temayla tasarlanmıştır, mağaza sahibi ayrıca Tema ekranına gitmek zorunda kalır.
- Geçişte örneklerin hepsinin kalması: iki demonun ürünleri karışır.
- Ek silinse de örnek kalmak: mağaza sahibi ürünü sahiplenmek için ayrı bir işlem öğrenir.
- İlk demodan önceye dönmek, satıştaki mağazada hiç aktarmamak, temayı değiştirebilen her rolün aktarabilmesi, demo sitesi, satılmayan örnek ürün, arama motoruna açık örnek ürün.

## Sonuçları

- Ürünün örnek olduğu ve hangi içe aktarmadan geldiği adından ayrı bir işaretle saklanır; düzenleme işareti kaldırır. Kategori, marka, blog yazısı, sayfa ve kupon da hangi içe aktarmadan geldiğini taşır (geçişte ve geri dönüşte kaldırılmak için).
- Her içe aktarma önceki düzenin ve menülerin sürümünü saklar; "önceki hâline dön" yalnız son içe aktarmayı geri alır.
- Satışa açılış ayarı Açılış bölümünde gelir; o güne kadar satıştaki mağaza kuralı hiç tetiklenmez, testte ayarın iki değeriyle denenir.
- Her paketin önizleme görselleri pakette durur (bugün tanımda tek önizleme görseli var; kategori ve ürün sayfası görselleri kart 0347'de eklenir).
- Örnek ürün satılabildiği için sipariş alan örnek ürün geçişte kalır ve "(örnek)" ekiyle siparişte görünür.
- Panelin Ürünler ekranına "Örnek ürünler" süzgeci gelir.
