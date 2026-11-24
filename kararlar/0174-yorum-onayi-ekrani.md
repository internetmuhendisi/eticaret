# 0174 · Panelin Yorumlar ekranı ve menüdeki sayı

## Tarih

2026-11-24

## Karar

Panelde Ürünler altında "Yorumlar" ekranı açıldı (kart 0277; taslak ve ürün kararları karar 0157, yorumun kuralları karar 0109).

Ürün kararları taslaktan (kullanıcı onayladı):

- Liste **Onay bekleyen** sekmesiyle açılır; sekmeler Onay bekleyen, Yayında, Reddedilen. "Tümü" sekmesi yoktur.
- Onay bekleyende Yayınla ve Reddet; yayındakinde Ana sayfada göster (ya da kaldır) ve Yayından kaldır; reddedilende Yayınla. "Yayından kaldır" yorumu reddedilenlere alır.
- Reddedilen yoruma müşteriye bildirim gitmez. Yorum metni değiştirilmez, mağaza cevap yazmaz.
- Toplu işlemler: yayınla ve reddet.
- Onay bekleyen yorum sayısı panel menüsünde görünür; yönetici e-postasında "Yorumlara git" düğmesi bu ekrana gelir.

Teknik kararlar:

- **Servis** `cekirdek/moduller/yorum/panel-listesi.ts`: arama (ürünün adı ya da kısaltılmış ad, aramanın harf kuralıyla), puan süzgeci (birden çok), dört sıralama (en yeni, en eski, puan artan ve azalan; eşitlikte en yeni), sayfa ve durum sayıları tek yerde. Sayılar puana ve aramaya uyar, duruma uymaz. Toplu karar her yorumu tekil kararla (`yorumServisi.karar`) aynı yoldan, kendi işleminde geçirir.
- **Silinmiş ürünün yorumu** listede, sayılarda ve menüdeki sayıda yoktur: hiçbir yerde görünmez, karar beklemez.
- **İzinler değişmez:** görmek `yorum.gor`, karar ve ana sayfa işareti `yorum.onayla`; görevlide ikisi de var (kart 0139). Ürün adı yalnız `urun.gor` izni olana ürün ekranına bağlantıdır.
- **Liste motoru genişledi:**
  - Sekme süzgecine varsayılan değer (`varsayilan`). Verilirse şeritte "Tümü" yoktur, değer adrese yazılmaz, süzgeç sayılmaz. Varsayılan sekme boşken öteki sekmelerde kayıt varsa arama ve süzgeçler durur; liste bunu sekme sayılarının toplamından (`""`) bilir.
  - Her genişlikte kart görünümü (`gorunum="kartlar"`): uzun metin taşıyan liste tabloya sığmaz. Sütun başlığı olmadığı için sıralama yalnız menüdedir.
- **Menüdeki sayı** sayfa ağacının `sayac` alanıdır. Sayıyı sunucu `menu-sayaclari.ts` ile, yalnız menüde görünen sayfalar için, istek başına okur. Sıfırsa görünmez. Okunamazsa menü sayısız çizilir, hata kaydedilir. Rozet ekran okuyucudan gizlidir; bağlantının adı yazıyla okunur ("Yorumlar (3 yorum onay bekliyor)"). Panelin işlemleri sayfayı yenilediği için sayı işlemden sonra güncellenir.
- **Odak:** eylemden sonra kart listede kalıyorsa odak onun ilk düğmesine gider. Sekmeden çıktıysa sonraki, yoksa önceki kartın düğmesine; liste boşaldıysa seçili sekmeye. Odak yenilenen liste gelince yerleşir.
- **Liste ucu** (`GET /kapi/yonetici/yorumlar`) liste tanımının girdisini alır, sayfayla aynı veriyi döner. Eski `durum` ve `sayfa` parametreleri geçerli kalır, `yoneticiSayfasi` sınırı yerine mağazanın `panelSayfaBoyu` ayarı kullanılır.

Taslaktan bilerek ayrılanlar:

- Yıldızlar yazı renginde çizilir. Taslaktaki ana renk beyaz zeminde 3:1'i tutmaz; puan görünürde yalnız yıldızlarla verilir. Vitrin de yazı rengini kullanır.
- Tarih panelin öteki listeleri gibi kısa tarih ve saattir (`tarihSaat`).
- Kartta "Vitrinde gör" bağlantısı vardır (kart: vitrine bağlantı); sayfası açılmayan üründe yoktur.

## Neden

Uçlar kart 0139'dan beri vardı, ama ekran olmadığı için yorumlar onay bekleyip birikiyordu. Liste motorunu genişletmek, yorum ekranına ayrı bir liste yazmaktan iyidir (kural: motorun yapamadığını motora ekle). Varsayılan sekme, bakılması gereken işin listesini ilk açılışta gösterir.

## Düşünülen diğer yollar

- **"Tümü" sekmesini koruyup menüyü ve e-postayı `?durum=onay-bekliyor`'a bağlamak:** taslağa uymuyordu. Panelden doğrudan açılan liste bekleyen işi göstermezdi.
- **Yorumları tabloda göstermek:** uzun metin sütunu tabloyu okunmaz yapar, taslak kart ister.
- **Menü sayısını tarayıcıda ayrı istekle okumak:** her sayfada fazladan istek demekti. Sunucu düzeni zaten istek başına çiziyor.
- **Silinmiş ürünün yorumunu listede tutmak:** karar beklemezler, sayıyı şişirirlerdi.

## Sonuçları

- Menüdeki sayı her panel sayfası çiziminde bir sayım sorgusu ekler (yorumlar ürünlerle birleşir; sorgunun hızı ölçülmedi). Başka sayaç eklenirse aynı yoldan gelir.
- İstemcide sayfadan sayfaya geçişte düzen yeniden çizilmez; sayı ancak sayfa yenilenince (işlem ya da yeniden yükleme) güncellenir.
- Liste motorunun iki yeni seçeneği (varsayılan sekme, kart görünümü) öteki listelerde kullanılmıyor; davranışları değişmedi (tarayıcı testleri).
