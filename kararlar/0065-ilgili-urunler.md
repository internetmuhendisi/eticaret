# 0065 · İlgili ürünlerin kuralı

## Tarih

2026-11-08

## Karar

Ürünün ilgili ürünleri tek işlevle bulunur: `ilgiliUrunleriGetir` (`cekirdek/moduller/urun/ilgili.ts`, kart 0079). Elle seçim ürün girdisinin `ilgiliUrunler` alanıyla ürün servisinden yazılır ve `urun_ilgilileri` tablosunda sırasıyla durur.

- **Sayı (kullanıcı kararı):** Vitrinde en çok 4 ilgili ürün görünür (`ilgiliUrunSiniri`). Elle en çok 20 ürün seçilebilir; öndekiler vitrinden çıkarsa sonrakiler yerlerini alır.
- **Elle seçim:** Seçim sırasıyla gelir. Ürün kendisini seçemez (veritabanında da denetlenir), silinmiş ya da olmayan ürün seçilemez, aynı ürün iki kez seçilemez. Liste verildiğinde tablo her zaman baştan yazılır; değişen liste ürünün değişiklik kaydına sırasıyla girer, aynı kalan girmez. Seçilen ürün sonradan silinirse satır kalır, okunmaz ve vitrinde görünmez.
- **Kategoriden (kullanıcı kararları):** Elle seçim yoksa ya da seçilenlerin hiçbiri vitrinde görünmüyorsa, ürünün silinmemiş kategorilerindeki öteki ürünler en yeni önce gelir. Seçilenlerin bir kısmı görünüyorsa liste kategoriden tamamlanmaz.
- **Görünürlük:** Ürünün tek vitrin koşuluyla, liste yeri için (karar 0062): taslak, gizli, arşiv, zamanı gelmemiş ve silinmiş ürün girmez. Ürünün kendisi hiçbir zaman girmez. Ürünün kendi sayfası vitrinde açılmıyorsa (taslak, arşiv, zamanı gelmemiş, silinmiş) liste boştur; gizli ürünün sayfası açıldığı için listesi gelir.
- **Tek sorgu:** Elle seçim, kategoriden gelenler ve görünürlük tek sorguda birleşir.
- **İzin:** Seçim ürünün parçasıdır, `urun.degistir` ile yazılır. Yeni izin yoktur.

## Neden

- En yeni önce sıra, her ziyaretçiye aynı listeyi verir; sayfa önbellekte tutulabilir (kullanıcının seçtiği yol).
- Görünen seçim kalmayınca kategoriye düşmek, mağaza sahibi listeyi güncellemeyi unutsa da alanı boş bırakmaz.
- Seçimin bir kısmı görünüyorsa tamamlamamak, elle yapılan seçimin anlamını korur: mağaza sahibi bilerek az ürün seçmiş olabilir.

## Düşünülen diğer yollar

- **Rastgele sıra:** Kullanıcı seçmedi, sayfa önbelleğe alınamazdı.
- **Görünen seçim kalmayınca boş bırakmak:** Kullanıcı seçmedi.
- **Seçimi kategoriden tamamlamak:** Seçilmedi, elle seçimin anlamı kaybolurdu.
- **Sayıyı site ayarı yapmak:** Kart sayıyı tek işlevde istiyor; temalar gelince temanın ayarı olabilir.
- **Kategoriden gelirken alt kategorileri de saymak:** Seçilmedi. Ürün zaten en özel kategorisine bağlanır; üst kategorinin bütün ürünleri ilgili olmaktan uzaklaşır.
- **Ürün silinince başka ürünlerin seçimlerinden de çıkarmak:** Seçilmedi. Silme başka ürünlerin kaydına dokunmaz; silinen ürün okunurken ve vitrinde süzülür.

## Sonuçları

- Stok durumuna göre süzme kart 0083 bitince bu işleve eklenir.
- Silinen ürünün başka ürünlerin seçimlerinde kalan satırları, o ürünlerin seçimi bir sonraki kaydedilişte (liste aynı kalsa da) kalkar. Değişiklik kaydında silinen seçim ayrı bir girdi olmaz: bir önceki kaydın yeni listesi silinen ürünü taşır, sonrakinin eski listesi taşımaz.
- Seçilen ürünün görünürlüğü her okumada yeniden bulunur; panel, seçilen ama vitrinde görünmeyen ürünleri ayrıca göstermelidir (panel bölümü).
