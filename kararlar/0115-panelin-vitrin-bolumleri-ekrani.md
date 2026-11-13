# 0115 · Panelin vitrin bölümleri ekranı ve Slider kısayolu

## Tarih

2026-11-13

## Karar

Mağaza sahibi vitrinin üst kısmını, ana sayfasını ve alt kısmını panelin "Vitrin bölümleri" ekranından yönetir (kart 0142). Ana menüdeki "Slider" kısayolu ana sayfadaki kayan afişin formunu doğrudan açar (karar 0101).

- **Uçlar:** düzen için yedi yönetici ucu vardır: okuma, bölüm ekleme, değiştirme, gizleme ya da gösterme, silme, sıralama ve önceki hâline dönüş (`cekirdek/kapi/yonetici/duzen.ts`). Okuma `duzen.gor`, ötekiler `duzen.degistir` ister. Kurallar düzen servisindedir, uç yalnız yönlendirir.
- **Önceki hâline dönüş:**
  - Son sürümden bir önceki sürümün düzeni yeni sürüm olarak yazılır, yani "son değişikliği geri al". Art arda basılırsa son iki hâl arasında gidip gelir. Bu, temanın geri dönüşüyle aynı kuraldır.
  - Ekran gördüğü son sürümün sırasını gönderir. Sunucu düzen kilidini aldıktan sonra son sürüm başkaysa hiçbir şey yazmaz (`cakisma`). Arada başka bir değişiklik olmuşsa ya da aynı düğmeye ikinci kez basılmışsa böyle olur.
  - Silmenin bildirimindeki "Geri al" silmenin yazdığı sürümün sırasını gönderir. Yalnız o silme hâlâ son değişiklikse döner.
  - Son sürümü bir tema değişikliği yazdıysa dönülmez (`tema-degisikligi`). Tema ve düzen yalnız tema servisi üzerinden birlikte değişir (karar 0091). Panelden yapılan dönüş ayrı bir işlem adıyla kaydedilir (`duzen.onceki-hale-donuldu`).
  - Önceki hâl sonradan silinen bir kayda (kategori, marka, etiket, ürün, menü, görsel) başvuruyorsa dönülmez (`surum-kullanilamaz`).
- **Görsel seçimi:**
  - Görsel alanı sitede kayıtlı ve bütün boyutları hazır görsellerden seçilir, en yeni önce (kullanıcı kararı). Panelden görsel yükleme bu kartta yoktur (kart 0160).
  - Panel önizlemeyi ayrı bir yönetici ucundan alır (`panel-gorseli`, `duzen.gor`), çünkü vitrin görseli ucu henüz seçilmemiş görseli vermez. Bu uç yalnız kayıttaki boyutları verir. Yanıtı `private` önbelleklidir.
  - Görseller ekran okuyucuda sırası ve ölçüsüyle adlandırılır.
- **Formun seçenekleri:**
  - Kategori, marka, etiket, ürün ve menü listeleri gerçek kayıtlardır. Yalnız silinmemiş olanlar gelir.
  - Kategoriler ağaç sırasındadır ve üst kategorilerin adını taşır ("Kadın › Tişört"). Öteki listeler ada göre sıralıdır.
  - Her liste en çok 500 kayıt, görseller en çok 200 tanedir (`panelSecenekSinirlari`). Arayarak seçmek kart 0161'dedir.
- **Ekranın biçimi:**
  - Alanlar sekme sekme gösterilir. Bölümler sıralanabilir listededir: tutamak, klavye, yukarı ve aşağı al düğmeleri.
  - Ekleme ve düzenleme formu yan pencerede açılır, "Kaydet ve yayınla" ile kaydedilir.
  - Kaydedilmemiş değişiklikle pencere kapatılmak istenirse önce sorulur.
  - Silme onay sormaz. Bildirimdeki "Geri al" önceki hâline döner. Silinen satırın yerine odak komşu satıra geçer.
  - Formun hatası formun içinde gösterilir. Öteki işlemlerin sonucu bildirimle verilir.
- **Bildirim alanı:** panelin çerçevesinde bir kez durur, bütün panel ekranları onu kullanır.
- **Slider kısayolu:**
  - Ana sayfada slider yoksa yeni slider formu açılır, kaydedilince ana sayfanın en üstüne eklenir.
  - Birden çok slider varsa sıradaki ilki açılır ve sayısı yazar. Açılan slider gizliyse bu yazar ve "Görünür yap" düğmesi durur.
  - Sayfa `duzen.degistir` ister. Adı bölüm tarifinin adıdır (`vitrin.bolum.kayanAfis.ad`), ikinci bir anahtarda yazılmaz.
  - Yeni slider bir boş slaytla açılır: en az öğe isteyen liste o kadar boş öğeyle başlar.

## Neden

- Önceki hâline dönüşün kuralı temadakiyle aynı tutuldu. Mağaza sahibi iki ekranda aynı düğmeden aynı davranışı bekler. Düzen sürümleri zaten saklandığı için yeni tablo ya da alan gerekmedi.
- "Gördüğüm sürüm hâlâ son mu" sorusu, bağımsız kontrolün bulduğu iki hatayı kapatır:
  - Silmenin "Geri al"ı arada yapılan başka bir değişikliği geri alıyordu.
  - Düğmeye iki kez basmak ilk dönüşü geri alıyordu.
  İkisi de ilk hâlde ölçülerek bulundu ve testte.
- Silinmiş kayda başvuran sürüme dönmek, vitrinde çizilmeyen ve düzeltilmesi gereken bölümler yazardı. Dönüşü reddetmek ve nedenini söylemek daha açıktır.
- Görsel yükleme şu altyapıyı ister: gövde sınırı, kutuların bellek sınırı ve görsel küçültmenin sunucuda çalışması (kart 0094'ün koşulları). Kullanıcı bu kartta eldeki görsellerden seçim yapılmasını seçti.
- Silmeyi onay penceresiyle sormak yerine geri almak, mağaza sahibine bir adım az bırakır. Silinen bölüm önceki sürümde durduğu için geri alınabilir (`.claude/rules/bilesenler.md`: mümkünse geri alma sun).

## Düşünülen diğer yollar

- **Dönüşte sürüm geçmişinde geriye yürümek** (her basışta bir öncekine): her sürüme "neye dönüldü" bilgisini yazmayı (veritabanı değişikliği) ister, temadan da farklı davranırdı.
- **Dönüşü her zaman son sürüme göre yapmak:** ilk hâl buydu. Bağımsız kontrol iki hatayı buldu (yukarıda), bırakıldı.
- **Tema değişikliğinden sonra düzeni tek başına geri almak:** yeni temaya eski temanın düzeni konurdu.
- **Silinmiş kayda başvuran bölümü dönüşte atlamak:** mağaza sahibi geri gelen düzenin eksik olduğunu fark etmezdi.
- **Görsel yüklemeyi bu karta katmak:** kart belirgin biçimde büyürdü. Kullanıcı seçmedi.
- **Seçeneklerde arama (yazdıkça bulma):** büyük katalogda doğru yoldur ama yeni bir ortak parça ister. Kart 0143 yazacak, kart 0161 bağlar.
- **Slider kısayolunu Vitrin bölümleri ekranında pencere olarak açmak (taslaktaki gibi):** ayrı sayfa menüde seçili durur ve adresi paylaşılabilir. Form aynıdır.

## Sonuçları

- Daha eski bir sürüme bu ekrandan dönülemez. Art arda iki "önceki hâline dön" ikinci değişikliği geri getirir.
- Mağaza sahibi sayfa yenilenmeden düğmeye çok hızlı basarsa "Düzen bu arada değişti" görebilir. Hiçbir şey yazılmaz, liste yenilenir.
- 500'den çok ürünü olan mağazada formun ürün listesi eksik kalır (kart 0161). 200'den eski görseller seçilemez.
- Görsel yükleme gelene kadar mağaza sahibi yeni bir slider görseli koyamaz, yalnız eldekilerden seçer (kart 0160).
- Kaydedilmemiş değişiklik uyarısı pencere kapanırken ve sayfa kapanırken çalışır. Slider sayfasında panel menüsünden başka sayfaya geçince uyarmaz (Next.js içi geçiş). Bu durum yalnız disiplindir.
- Yalnız `duzen.gor` izni olan yönetici ekranı görür ama değiştiren düğmeleri görmez. Bugün böyle bir rol yoktur, bu yol testte yoktur.
- Formun kendisi (kart 0106'nın bölüm formu) taslaktaki slayt akordeonunu, renk örneklerini ve karakter sayacını taşımaz. Bunlar kart 0163'tedir.
