# 0163 · Ürün ekranının seçenekleri: yeni seçenekte var olan birimler korunur

## Tarih

2026-11-22

## Karar

Panelin ürün ekranına seçenekler bölümü eklendi (kart 0264). Bölüm ürünün tek formunun parçasıdır, "Kaydet" ürünle birlikte kaydeder (karar 0162).

- **Yeni seçenekte var olan birimler korunur (kullanıcı kararı):** Ürüne yeni bir seçenek eklenince var olan her birim yeni seçeneğin ilk değerini alır. Basit ürünün tek birimi ilk birleşim olur: tek fiyatı ve 20 stoğu olan tişörte "Beden: S, M, L" eklenince o birim "S" olur. Birleşimleri olan ürüne "Renk: Gri, Lacivert" eklenince "S" birleşimi "S / Gri" olur. Stok kodu, fiyat, stok ve geçmişleri birimde kalır. Yalnız öteki değerlerin birleşimleri boş açılır. Karar 0071'in iki kuralı (basit birim silinir, birleşimi olan ürüne seçenek eklenmez) kalktı. Kural servistedir (`secenekEkle`), başlangıç kataloğu da dönen birimi ilk birleşim olarak kullanır.
- **Tek işlem:** Panel seçeneklerin, değerlerin ve birleşim alanlarının son hâlini gönderir. Servis bunu `varyantlariKaydet` ile var olan işlemlerden geçirerek yazar, uç ürünün değişikliğiyle aynı veritabanı işleminde çağırır: biri düşerse hiçbiri kalmaz. Var olan seçenek ve değer kimliğiyle, yenisi kimliksiz gelir. Hata girdideki yerin yoluyla döner (`secenekler.0.degerler.2`, `birlesimler.3.stokKodu`). Değişiklikte seçenekler ürünün alanlarından önce yazılır: son seçeneği kaldırılan ürüne aynı kayıtta yazılan stok kodu, barkod ve ağırlık yeni basit birime gider (bağımsız kontrolün bulgusu).
- **Eski ekran:** Ekran gördüğü kayıtlı seçenek ve değer kimliklerini gönderir (`gorulen`). Ürünün bunlardan başka bir seçeneği ya da değeri varsa (bu arada başka bir ekrandan eklenmiş) hiçbir şey yazılmaz, `varyant-degisti` döner: görülmeyen kayıt "çıkarıldı" sayılıp birleşimleriyle silinmez (bağımsız kontrolün bulgusu).
- **Birleşimler kendiliğinden kurulur (taslak):** Birleşimler bütün değerlerin birleşimidir. Eksik olan kaydedilince açılır. Tek bir birleşimi elle silmek yoktur, satılmayan birleşim stok 0 ile tükenmiş görünür. Tablo her birleşimin görselini (ürünün galerisinden), stok kodunu, barkodunu ve ağırlığını gösterir. Fiyat ve stok sütunları kart 0265'tedir.
- **Silme izni:** Kayıtlı bir seçeneği ya da değeri çıkarmak onun birleşimlerini siler. Bu yüzden `urun.sil` ister (görevli silemez, kart 0261'deki özellik seçeneği kuralıyla aynı yol). Uç izni okur, servis denetler, ekran düğmeyi göstermez. Kaldırmadan önce onay penceresi kaç birleşimin silineceğini söyler.
- **Görünüş:** Taslaktaki değer "çipleri" yerine sıralanabilir satırlar kullanıldı. Kart değerlerin sıralanmasını ister. Çipte yanlış sıradaki değeri düzeltmenin tek yolu silip yeniden eklemek olurdu, bu da kayıtlı birleşimlerin stoğunu ve fiyatını siler. Seçenekler ayrı kartlardır, sırası kartın başlığındaki yukarı ve aşağı al düğmeleriyle değişir. Böylece iç içe sıralanabilir liste telefonda değerin alanını daraltmaz. Birleşim tablosu içeriği kadar geniştir, telefonda kendi kabında kayar.

## Neden

- Mağaza sahibi tek fiyatlı bir ürüne sonradan beden eklediğinde elindeki stok kaybolmamalı. Bugünkü kural birimi sildiği için 20 stok ve fiyat yeniden girilirdi, geçmiş başka birimde kalırdı. Var olan stok gerçekte ilk değere aittir (tek renkli ürünün bütün stoğu o renktir).
- Birleşimi olan ürüne seçenek eklenememesi, mağaza sahibini önce bütün birleşimleri silmeye, yani stoğu ve fiyatları kaybetmeye zorluyordu.
- Tek işlem: seçenek, değer ve birleşimler ayrı ayrı kaydedilseydi yarıda kalan bir kayıt ürünü birleşimsiz ya da yarım bırakabilirdi.
- Kendiliğinden kurulan birleşimler taslakta kararlaştırıldı. Mağaza sahibi altı birleşimi tek tek açmaz.

## Düşünülen diğer yollar

- **Eskiler silinir, bütün birleşimler fiyatsız ve stoksuz yeniden açılır (onay penceresiyle):** Kural sade, ama mağaza sahibi fiyat ve stoğu yeniden girer, geçmiş eski birimde kalır. Kullanıcı seçmedi.
- **Bugünkü kural (basit birim silinir, birleşimi olan ürüne seçenek eklenmez):** Taslaktaki "bugünkü fiyat ve stok ilk birleşime geçer" cümlesiyle çelişiyordu. Kullanıcı seçmedi.
- **Seçenek, değer ve birleşimin ayrı uçlarla anında kaydı:** Ürün ekranının tek "Kaydet"ini (karar 0162) bozardı. Yarım kalan kayıt ürünü tutarsız bırakabilirdi.
- **Taslaktaki değer çipleri:** Daha kısa, ama sıralama yok.
- **Birleşim sınırını aşan kaydı kısmen yazmak:** Yüz birleşimi aşan girdi hiçbir şey yazmadan reddedilir.

## Sonuçları

- Yeni seçenek eklenen üründe birimin anlamı genişler: "S" birimi "S / Gri" olur. Eski siparişler ürünün o anki adını ve fiyatını sakladığı için değişmez. Birimin stok geçmişi yeni anahtarla sürer. Bu, geçmişte "S" olarak satılan ürünün gerçekte gri olduğunu varsayar.
- Bir seçeneği silmek, kalan seçeneklerde de bütün birleşimleri siler ve yeniden açar. İki seçenekli "S / Gri" birleşimi tek seçenekli "S"ye dönüşmez (iki birleşim tek birleşime düşerdi). Onay penceresi bunu söyler.
- Aynı adla silinip yeniden eklenen değer yeni bir değerdir. Eski birleşimlerinin stoğu ve fiyatı geri gelmez. Adlar uygulamada karşılaştırılmaz (karar 0064).
- Birleşimleri eksik bir ürün (başka yoldan kurulmuş) panelden ilk kaydedilişinde eksik birleşimleri kazanır. Örnek Mağaza'nın dört seçenekli ürününün birleşimleri tamdır.
- Seçenekleri değişmeyen kayıtta bölüm gönderilmez. Değişince bütünüyle gider ve servis her birleşimin alanını ayrı ayrı yazar. Yüz birleşimlik ürünün kaydı yüz çağrıdır (karar 0071'deki bedel).
- Testlerde birleşimlerini kendisi kuran testler dönen birimi önce siler (`donusenBirimiSil`). Eski kuraldaki durum aynen kurulur; silinmiş birim artık boş anahtarlı değil ilk değere bağlıdır ve iki değişiklik kaydı fazladır.
- Ad değişiklikleri tek tek, tekillik denetimiyle yazılır: iki değerin ya da iki seçeneğin adını birbirine çevirmek (S ile M) "tekrar" hatası alır, iki kayıtta yapılır. Bütün değerleri değişen seçenekte ertelenen eski değerle aynı adda yeni değer de "tekrar" alır. Elli değerin hepsi elli yeniyle değişirse ertelenen eski değer sınıra sayılır. Üçü de bilinen sınırdır, testte yok.
