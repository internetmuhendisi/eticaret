# 0133 · Fiyatsız birim satılabilir sayılmaz

## Tarih

2026-11-16

## Karar

Fiyatı olmayan birim, stoğu olsa da ya da stok takibi kapalı olsa da satılabilir değildir ve tükenmiş sayılır (kart 0155, kullanıcı kararı). Kural karar 0069'daki "satılabilir" tanımına eklenir ve yalnız stok modülünde yazılır (`cekirdek/moduller/stok/durum.ts`):

- Birim satılabilir: silinmemiş, fiyatı var, ürünün takibi kapalı ya da stoğu var.
- Fiyatı var: birimin fiyat satırı vardır ve sitenin para birimindedir. Bu, geçerli fiyatın (`gecerliFiyat`, karar 0066) "başka para birimindeki fiyat yok sayılır" kuralıyla aynıdır.
- `stokDurumu` fiyatsız birimi tükenmiş sayar ("Tükendi"). Birimin bilgisi (`BirimStokBilgisi.fiyatli`) aynı tek sorguda okunur; stok ayarları sitenin para birimini taşır (`StokDurumAyarlari.paraBirimi`, `siteninStokAyarlari`).
- Veritabanında tanım tektir: `birimSatilabilirKosulu(paraBirimi)`. Listenin tükenmişlik süzgeci (`tukenmisUrunKosulu`) ve filtrenin "yalnız stoktakiler"i onu kullanır.
- Vitrin koşulunun "gizle" seçeneği sitenin para birimini de taşır (`VitrinStokSecenegi`); siteden okunan ayar `vitrinStokSecenegi(site, ayarlar)` ile kurulur. "Göster" ve sayfa yeri para birimi istemez.

Böylece kart, liste ("tükeneni gizle"), filtre, ilgili ürünler, ürün bölümlerinin kaynakları ve ürün sayfası aynı sonucu verir. Ürün sayfasının kendi kuralı (kart 0138) ve stoğa gelince haber ver eklentisinin kendi fiyat denetimi kaldırıldı; ikisi de çekirdeğin işlevini kullanır.

## Neden

- Fiyatı olmayan birim zaten satın alınamaz (kart 0080, karar 0071). Satılabilir saymak, satın alınamayan ürünü listede "stokta" gösteriyor, "tükeneni gizle" ayarında listede bırakıyor ve kartta "Tükendi" rozetini gizliyordu; ürün sayfası ise aynı ürüne "Tükendi" diyordu (ölçüldü).
- Kuralın tek yerde olması, sayfa, kart ve listenin birbirinden ayrışmasını önler.

## Düşünülen diğer yollar

- Fiyatsız stoklu birimi satılabilir saymak (bugünkü çekirdek): ürün listede görünür, ama müşteri sayfada "Tükendi" görür ve alamaz; seçilmedi.
- Listede para birimine bakmadan "fiyat satırı var" demek: vitrin koşulunun çağrılarına para birimi taşımak gerekmezdi, ama site para birimi değişince başka birimdeki fiyat listede satılabilir, kartta tükenmiş görünürdü; seçilmedi.
- Fiyat denetimini ayrı bir sorguyla yapmak: birim sayısıyla artmaz ama her okumaya bir sorgu ekler; fiyat aynı sorguya bağlandı.

## Sonuçları

- Bütün birimleri tükenmiş ya da fiyatsız olan ürün kartta "Tükendi" yazar, "tükeneni gizle" ayarında listelerden çıkar (sayfası açık kalır), "yalnız stoktakiler" filtresine girmez. Mağaza sahibi fiyatı girince ürün kendiliğinden döner.
- Stoğa gelince haber verde fiyatsız birime talep yazılır, e-posta fiyat girilip birim satılabilir olunca gider (davranış değişmedi, kural çekirdeğe taşındı).
- Fiyatsız ürün kuran eski testler fiyat yazmak zorundadır: satılabilir saydıkları ürün artık tükenmiştir.
- Stok servisinin yalnız miktar ve takip okuması (`birimStoklariniOku`) fiyata bakmaz.
- Ürün sayfasının ilgili ürünleri iki katmanla süzülür: `ilgiliUrunleriGetir` ve kartların vitrin koşulu (`urunKartlari`); ikisi de sitenin ayarını `vitrinStokSecenegi` ile alır.
- Sepet ve sipariş bu kuralı kendi işlerinde kullanır (bölüm 12); bu karar onlara dokunmaz.
