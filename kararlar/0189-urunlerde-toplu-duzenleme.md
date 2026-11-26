# 0189 · Ürünlerde toplu düzenleme

## Tarih

2026-11-27

## Karar

Ürünler listesinin toplu işlem çubuğuna dört düzenleme eklenir (kart 0314): "Fiyatı değiştir", "Stoğu değiştir", "Kategoriye ekle", "Kategoriden çıkar". Çubukta durum işlemlerinden (yayınla, taslağa al, arşive al, sil) öncedir. Her biri kendi yan penceresini açar; önce "Önizle", sonra "N ürüne uygula". Servis `cekirdek/moduller/urun/toplu-duzenleme.ts`, uçlar `urunler-toplu-onizle` ve `urunler-toplu-duzenle`, işler ve izinleri `urunTopluDuzenlemeleri` (`cekirdek/kayitlar/urun.ts`).

- **Fiyat:** satış fiyatı ya da indirimli fiyat, yüzde ya da tutarla artırılır ya da azaltılır; indirimli fiyatta ayrıca "satış fiyatından indir" (yeni indirimli fiyat = satış fiyatı − oran ya da tutar). Varyantlı üründe her birleşime ayrı uygulanır. Sonuç kuruşa yuvarlanır, yarım yukarı (karar 0185); hesap tam sayıyla yapılır. Oran en çok iki ondalıklıdır; artırmada en çok %1000, azaltmada ve indirimde en çok %100.
- **İndirimin zamanı:** yalnız indirimli fiyatta verilir. Verilen başlangıç ya da bitiş bütün değişen birimlere yazılır. Boş bırakılan zaman birimin kayıtlı zamanıdır; daha önce indirimi olmayan birimde indirim süresizdir (kullanıcı kararı). Satış fiyatı değişince indirim ve zamanı olduğu gibi kalır. Bitişi geçmiş indirim yok sayılır: zamanı yeni indirime taşınmaz, satış fiyatı değişince silinir. Bitiş (verilen ya da birimin kayıtlı zamanı) başlangıçtan sonra değilse ürün önizlemede "indirim-sirasi" ile işlenmez. Yalnız zamanı değişen birim de değişmiş sayılır ve yazılır.
- **Sıfır fiyat:** yeni satış ya da indirimli fiyat sıfır ya da altındaysa ürün işlenmez ("sifira-iniyor"). Ücretsiz ürün yalnız ürün ekranından tek tek yapılır (kullanıcı kararı).
- **Stok:** ekle, çıkar ya da verilen miktara çek; sebep ve not stok geçmişine yazılır ("Diğer"de not zorunlu; notun kuralı stok servisinindir ve önizlemede alanın hatası olur). Takibi kapalı ürün işlenmez, sıfırın altına inen ürün işlenmez.
- **Kategori:** seçilen kategoriler (en çok 20) eklenir ya da çıkarılır, ürünün öteki kategorileri kalır. Eklenince ürünün kategori sınırını (50) aşan ürün önizlemede "kategori-siniri" ile işlenmez. "Kategoriden çıkar" çubukta ayrı düğmedir (kullanıcı kararı; taslakta "Diğer" menüsündeydi).
- **Birim ve ürün:** fiyatsız birim ve indirimi olmayan birimin indirimli fiyatı (artırma, azaltma) yalnız o birimi atlar; ürünün hiçbir birimi işlenemiyorsa ürün o nedenle işlenmez. Kurala aykırı bir birim (sıfıra inen, indirimli fiyatı satıştan küçük kalmayan, sıfırın altına inen stok) bütün ürünü durdurur: ürün kendi işleminde ya hep ya hiç yazılır.
- **Önizleme ile uygulama arasında değişen ürün:** önizleme ürünlerin bugünkü fiyatlarını ve stoklarını (birim birim) döndürür, uygulama onlarla gider. Ürünün değerleri ya da birimleri değiştiyse ürün işlenmez ("degisti"), ötekiler işlenir.
- **Yazma:** fiyat yalnız fiyat servisiyle, stok yalnız stok servisiyle, kategori yalnız ürün servisiyle yazılır; geçmişler ve değişiklik kaydı yazanıyla girer. Bir ürünün hatası ötekileri durdurmaz (`TopluSonuc`).
- **İzin:** fiyat `fiyat.degistir`, stok `stok.duzelt`, kategori `urun.degistir`; uçlar `urun.gor` ister, işin kendi izni ayrıca denetlenir. Görevli stoğu ve kategoriyi değiştirir, fiyatı değiştiremez (düğmesini görmez).
- **Sonuç:** listede söylenir, odak sonuca gider; önizlemede işlenmeyecek görünen ürünler de nedeniyle yazar. Seçim yalnız işlenemeyen ürünlerde kalır (taslak).

## Neden

- Önizleme mağaza sahibinin yanlış oranı ya da yanlış yönü uygulamadan görmesini sağlar; görülen değerlerle uygulama, iki yöneticinin aynı anda değiştirdiği ürünü sessizce ezmez (ürün ekranının görülen miktar kuralıyla aynı).
- Servislerden geçmek fiyat geçmişini, "son 30 günün en düşük fiyatı"nı, stok geçmişini, stok kancalarını ve değişiklik kaydını kopyalamadan korur.
- Ürünün ya hep ya hiç yazılması, varyantlı üründe birleşimlerin yarısının yeni yarısının eski fiyatla kalmasını önler.
- Kuruşa yuvarlama ve tam sayı hesabı oranı tam tutar; büyük tutarda kayan noktalı sayının yuvarlama hatası olmaz (testte ölçüldü).
- Boş zamanda kayıtlı zamanın kalması, süreli bir kampanyadaki ürünlerin indirimini değiştiren mağaza sahibinin bitiş tarihini yeniden yazmasını gerektirmez.

## Düşünülen diğer yollar

- Önizlemesiz uygulama: hızlı ama geri alınamaz bir yanlış bütün sayfayı etkiler.
- Kurala aykırı birleşimi atlayıp ürünün ötekilerini yazmak: ürün yarım değişir, mağaza sahibi hangi birleşimin kaldığını bilmez.
- Sıfıra inen fiyatı ücretsiz saymak: yanlış yazılmış bir tutar ürünleri bedava yapar (kullanıcı kararıyla seçilmedi).
- Boş zamanın "süresiz" demesi: süreli indirimlerin bitişi sessizce silinirdi (kullanıcı kararıyla seçilmedi).
- ",90" yuvarlaması (karar 0185'te seçilmedi), "Kategoriden çıkar"ın "Diğer" menüsünde olması (kullanıcı kararıyla seçilmedi).
- Arka plan işi: bir sayfa (en çok 100 ürün) istekle işlenir; Excel'in büyük dosyası arka plan işidir (kart 0315).

## Sonuçları

- Önizleme ve uygulama iki istektir; önizlemeden sonra değişen ürün yeniden önizlenmelidir.
- Önizleme bütün birimleri döndürür (en çok 100 ürün × 100 birleşim); ekran en çok 50 satır gösterir, kalanı sayıyla söyler.
- Satış fiyatı indirimli fiyatın altına inen ürün işlenmez: önce indirim değiştirilmeli.
- Toplu fiyat değişikliği her birimin fiyat geçmişine bir satır yazar; eski fiyat hesabı geçmişi okur (kart 0081'in ölçülmemiş notu).
