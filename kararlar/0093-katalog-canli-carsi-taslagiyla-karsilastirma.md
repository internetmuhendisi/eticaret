# 0093 · Katalog Canlı Çarşı taslağıyla karşılaştırıldı: ikili tanıtım ve geniş afiş başlığı

## Tarih

2026-11-10

## Karar

Bileşen kataloğunun bölüm kütüphanesi Canlı Çarşı taslağıyla (`planlar/tasarim-yonu/secenekler.html`) yan yana karşılaştırıldı. Karşılaştırma bilgisayar (1280 px) ve telefon (390 px) genişliğinde, açık ve koyu temada yapıldı. Taslaktaki her bölüm, katalogda o türün ilk görünümüyle eşleştirildi. Görüntüler bölüm bölüm kesildi; yazıların hesaplanan stilleri (boy, kalınlık, yazı tipi, satır yüksekliği, renk) iki sayfada ölçüldü.

Düzeltilen iki fark:

- **Taslağın ikili tanıtımları kütüphanede yoktu.** Taslakta ürün vitrinlerinin arasında iki kartlık bir tanıtım bölümü var: görsel solda kendi renkli alanında, başlık, soluk açıklama ve çerçeveli "İncele" düğmesi sağda, yüzey renginde. Telefonda görsel üste iner. Katalog ve Örnek Mağaza bunun yerine dikey kampanya afişini kullanıyordu: yazı renkli zeminde, düğme altı çizili yazı.
  - Kampanya afişlerine üçüncü görünüm eklendi: "görsel solda" (`gorsel-solda`).
  - Masaüstünde iki sütundur. Tablette görsel ve yazı tek kartta yan yana durur, telefonda görsel üstte.
  - Görselsiz afişte renkli alan çizilmez.
  - Kartın odak çerçevesi kartın yazı renginde, görselin alanının da üstünden geçer. Bu yüzden görselin alanı yalnız üstünde yazı renginin okunduğu ölçülmüş zemini alır (kutu renkleri ve yüzey). Afiş rengi seçilmişse alan sıradaki kutu rengine düşer, çünkü Keskin Çizgi'nin açık temasında afiş rengi yazıyla aynıdır. Bağımsız kontrolün bulgusudur.
  - Örnek Mağaza'nın başlangıç düzenindeki ikili afişler bu görünüme geçti.
- **Geniş afişin başlığı telefonda küçüktü:** 24 px, taslakta 32 px. "Yan yana" görünümde başlık her genişlikte 32 px oldu. "Tam genişlik" görünümünde yazı görselin üstüne sığmalı, telefonda 24 px kaldı.

## Neden

- Taslak kullanıcının seçtiği yöndür (karar 0075). Ana sayfanın sırası ikili tanıtımı içerir, ama karşılığı olan bölüm görünümü yazılmamıştı. Yeni bir bölüm türü yerine görünüm eklendi, çünkü alanlar kampanya afişiyle aynıdır: görsel, rozet, başlık, metin, düğme yazısı, bağlantı, zemin.
- Görselin alanında odaklanan öğe yoktur. Renkli zeminin odak kuralı orada uygulanmaz (karar 0090'daki gibi). Odak, kartın tamamına yayılan başlık bağlantısındadır.

## Düşünülen diğer yollar

- **Ayrı "tanıtım" bölüm türü:** Alanlar kampanya afişiyle birebir aynı olurdu. Aynı veriyi iki türde tutmak, mağaza sahibinin aynı afişi görünüm değiştirerek kullanmasını engellerdi.
- **Taslaktaki gibi esnek genişlikle sarma (180 ve 200 px'ten kırılan satır):** Serbest ölçü denetimde yasaktır (karar 0076). Kırılma noktalarıyla aynı sonuç alındı.
- **Dikey kampanya afişini taslağa göre değiştirmek:** Dikey görünüm başka bir kullanımdır (görsel üstte, yazı renkli zeminde); onu kullanan sitelerin görünüşü değişirdi.

## Sonuçları

- Bu görünümde mağaza sahibinin afiş rengi seçimi görselin alanında kutu rengine döner. Görselsiz afişte seçilen renk görünmez (kart yüzey rengindedir).

Karşılaştırmada görülen öteki farklar daha önce bilerek bırakılmıştı:

- duyuru şeridinin yüksekliği ve yazısı: karar 0084;
- arama kutusu ve telefonda hesap: karar 0084;
- afişteki durdurma düğmesi ve fiyat, ölçekte olmayan küçük ölçüler (afiş metni 17/18 px, düğme 15/14 px, eski fiyat 13/12 px): kararlar 0079, 0086, 0087;
- bülten formunun zemin renginde bir kutuda olması ve onay kutusu: karar 0090.

Katalogdaki örnek içerik (ad, ürün, görsel) taslaktakinden farklıdır; tasarım farkı sayılmadı. Taslakla stil karşılaştırması testte yoktur, bir kez ölçüldü. Yeni görünümün kuralları birim testinde, katalogdaki örneği tarayıcıda iki renkte ve üç genişlikte taramadan geçer.
