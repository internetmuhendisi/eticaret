# 0161 · Panelin ürün listesi

## Tarih

2026-11-21

## Karar

Panelde "Ürünler" altında ilk sayfa ürün listesidir (kart 0262). Ortak liste ekranıyla (karar 0158) yazılır.

- **Kapsam:** taslak, zamanlanmış, gizli ve arşiv dahil bütün silinmemiş ürünler.
- **Arama:** ad ve silinmemiş birimin stok koduyla, aramanın harf kuralıyla (Türkçe harfsiz, büyük küçük harf ayrımsız), adın ya da kodun herhangi bir yerinden; % ve _ joker değildir. Ürün bilgisi kişisel değildir: aranan metin adreste durur.
- **Süzgeçler:** yayın durumu, kategori (alt kategorileriyle), stok durumu (stokta, az kaldı, tükendi), marka; hepsi birden çok seçilir. Stok durumu vitrinin kuralıdır: tükendi vitrindeki "satılabilir birim yok" tanımı (fiyatı olmayan birim tükenmiş sayılır, karar 0133), az kaldı tükenmemiş ürünün takipli bir biriminin düşük stok eşiğinde ya da altında olması (ürünün kendi eşiği, yoksa mağazanınki).
- **Kategori ve marka süzgeci** sitenin kayıtlarından gelir: ortak liste ekranı "kayıt" süzgeciyle genişletildi (`tur: "kayit"`). Seçenekleri sayfa verir, adreste kimlikle durur (sayfa ve uç aynı kimlik kuralıyla), kimlik olmayan değer yok sayılır, en çok 50 değer; silinmiş kayıt eşleşmez, şeritte "silinmiş kayıt" yazar.
- **Sıralama:** son değişen (varsayılan), ad, stok (toplam; takibi kapalı ürün sonda), fiyat (bugünkü girilen en düşük fiyat, indirim sürüyorsa indirimli; satırdaki fiyatın aday kuralıyla: önce satılabilir birimler, hiçbiri satılamıyorsa hepsi; fiyatı olmayan ürün sonda). Ad sitenin dilinin harf sırasıyla sıralanır (veritabanında ICU; yoksa dilden bağımsız Unicode sırası). Fiyat sıralamasına vergi çevirmesi katılmaz: sıra veritabanında kurulur, gösterilen fiyat yine vitrinin gösterimidir.
- **Satır:** ana görsel (görselleri görme izni olana), ad ve stok kodu (varyantlı üründe birleşim sayısı), yayın durumu (zamanlanmışta yayın zamanı), kategoriler, stok (adet, az kaldı, tükendi, tükenen birleşim sayısı), vitrindeki kartın fiyatı (`fiyatAraliklari`) ve sayfası vitrinde açılan üründe "Vitrinde gör".
- **Toplu işlemler** (karar 0157): yayınla, taslağa al, arşive al (`urun.degistir`), sil (`urun.sil`; görevli silemez). Her ürün tekil işlemle kendi işleminde; zamanlanmış ürün yayınlanınca yayın zamanı kalkar.
- **"Ürün ekle" ve satırdan ürün ekranına geçiş** ürün ekranıyla (kart 0263) gelir (kullanıcı kararı): ekranı yazılmamış sayfaya bağlantı verilmez.

## Neden

- Arama, süzgeç ve sıralamanın veritabanında yapılması mağaza büyüdükçe listeyi hızlı tutar; satırın fiyatı ve stoğu yalnız gösterilen sayfa için vitrinin işlevleriyle hesaplanır, iki kural ayrışmaz (stok süzgecinin satırla aynı sonucu verdiğini test ölçer).
- Kategori ve marka sitenin verisidir; liste tanımı sunucuda ve tarayıcıda çalıştığı için seçenek taşıyamaz. Motoru genişletmek, ileride müşteri, blog ve yorum listelerinde de aynı türü kullandırır.

## Düşünülen diğer yollar

- Fiyat sıralamasını vitrin gibi bütün ürünlerin gösterim fiyatıyla uygulamada yapmak: her sayfada bütün ürünlerin fiyatını hesaplamak gerekirdi.
- "Ürün ekle" düğmesini şimdiden bir yer tutucu sayfaya bağlamak: panel kuralı ekranı yazılmamış sayfaya bağlantıyı yasaklar.

## Sonuçları

- Süzgeç seçenekleri okunamazsa süzgeçler boş açılır, liste yine çizilir.
- Fiyat sıralaması vergi dahil gösterilen sitede farklı vergi sınıflı ürünlerde gösterilen fiyatların sırasıyla birebir aynı olmayabilir.
- Kategori süzgecinin menüsü çok kategorili sitede uzar (ekran yüksekliğinde kayar).
