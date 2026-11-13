# 0116 · Panelin menüler ekranı, kayıt arama ve onay penceresi

## Tarih

2026-11-13

## Karar

Mağaza sahibi menüleri ve alt bilgi bağlantılarını panelin "Menüler" ekranından düzenler (kart 0143). Menünün kuralları değişmez (karar 0082).

- **Uçlar:**
  - Menüler için dokuz yönetici ucu vardır: listeleme, bir menüyü okuma, menü ekleme, adını değiştirme ve silme; öğe ekleme, değiştirme ya da taşıma, silme ve sıralama (`cekirdek/kapi/yonetici/menu.ts`).
  - Okuma `menu.gor`, ötekiler `menu.degistir` ister.
  - Öğe uçta yalnız nesne olarak alınır. Menü servisinde ortak şemayla (`ogeGirdisi`, `ogeDegisikligi`) doğrulanır. Böylece menünün kendi hata kodları (`metin-gerekli`, `derinlik`) ekrana ulaşır; kapı yalnız şemanın kendi kodunu yazardı.
- **Kayıt arama:**
  - Kategori, marka ve ürün yazdıkça aranarak seçilir. Yetkisi olmayana nedeni yazılır (`GET /kapi/yonetici/kayit-ara`, `cekirdek/moduller/urun/kayit-arama.ts`).
  - Harf kuralı aramanınkidir: Türkçe harfsiz, büyük küçük harf ayrımsız, adın herhangi bir yerinde. Silinmemiş kayıtlar gelir, ada göre sıralı, sayfa başına 20.
  - Kategoriler üstlerinin adıyla gelir ("Kadın › Tişört") ve bu yolda aranır. Kategori yolunu üreten işlev tektir (`kategoriYollari`); vitrin bölümlerinin seçenekleri de onu kullanır.
  - İzin `urun.gor`'dur: aranan şey kataloğun adlarıdır, görevlide de vardır.
  - Ekranda kayıt arama, WAI-ARIA'nın liste önerili açılır kutusu olarak çalışır (`KayitArama`). Öneriler alanın altında, sayfanın akışında durur. Kart 0161 bu parçayı vitrin bölümlerinin formuna bağlar.
- **Taşıma (kullanıcı kararı):**
  - Aynı düzeydeki öğeler sürükleyerek ya da klavyeyle sıralanır.
  - Bir öğeyi başka bir öğenin altına almak satırın "Diğer işlemler" menüsündeki "Şunun altına taşı" ile, en üste çıkarmak "En üst düzeye çıkar" ile ya da formdaki "Üst öğe" seçimiyle yapılır.
  - Yalnız derinlik sınırını aşmayan yerler sunulur: altı olan öğe başka bir öğenin altına taşınamaz, üst öğe seçimi kapalıdır. Düzeyler arası sürükleme yoktur.
- **Ekran:**
  - Solda menüler, sağda seçili menünün öğeleri vardır. Seçili menü adreste durur (`?menu=`).
  - Hedefi silinmiş ya da görünmeyen öğe ve boş başlık işaretli ve açıklamalı görünür (servisin bildirdiği durum).
  - Kategori menüsü ağaçtan gelir: yalnız gösterilir, öğe eklenmez, nedeni yazar.
  - Adres hedefi formda iki seçenektir (taslak): "Sitenin sayfası" ve "Dış bağlantı". İkisi de adres hedefine yazılır; "Yeni sekmede aç" yalnız dış bağlantıda sorulur.
  - Yeni menünün kodu adından üretilir. Kod kullanılıyorsa sonuna sayı eklenip yeniden denenir. Bölümler menüyü koduyla seçer, mağaza sahibi kodu görmez.
- **Onay penceresi:**
  - Silme geri alınamaz (menülerin sürüm geçmişi yoktur), bu yüzden ortak onay penceresiyle sorulur (`OnayPenceresi`, `bilesenler/parcalar/onay-penceresi.tsx`).
  - Radix'in uyarı penceresidir: açılınca odak "Vazgeç"tedir, Escape vazgeçer, onay işi bitince kapanır, odak açan öğeye döner.
  - Açılır menüden açılan pencere, menü kapanıp odağı kendi düğmesine verdikten sonra açılır. Aynı anda açılınca menü, pencere kapandıktan sonra yeniden açılmıyordu (ölçüldü).
- **Ortak işlem:**
  - Panel ekranlarının "uca gönder, yenile, bildir" kalıbı tek kancadır (`usePanelIslemi`, `cekirdek/yonetim-paneli/panel-islemi.ts`); vitrin bölümleri ekranı da ona geçti.
  - Formun hatası alana bağlıysa metni alanın altındadır, üstte yalnız genel uyarı durur.
- **Sıralanabilir liste:** satırın içinde alt liste durabilir. Liste satırları üstten hizalayabilir (`hizalama="ust"`): tutamak satırın başlığıyla aynı hizada kalır.

## Neden

- Düzeyler arası sürükleme, ağaç sürüklemesi için ortak parçaya ciddi bir ek ister. Kullanıcı daha sağlam ve klavyeyle kolay olan menü ve form yolunu seçti.
- Kayıt seçimi arayarak yapılmalı (kart): büyük katalogda düz liste kullanılamaz. Arama sunucuda yapılır, sayfalıdır.
- Onay penceresi kütüphanede yoktu. Kural silmenin tek onay bileşeniyle sorulmasını ister (`.claude/rules/bilesenler.md`).

## Düşünülen diğer yollar

- **Düzeyler arası sürükleme ve klavyede sağ/sol okla girintileme:** kullanıcı seçmedi (yukarıda).
- **Öğe şemasını uçta tam doğrulamak:** menünün hata kodları kaybolurdu (kapı şemanın kendi kodunu yazar). Doğrulama serviste ortak şemayla yapılır, bu yolu düzen uçları da izler.
- **Kayıt aramanın izni olarak `menu.degistir`:** aynı parça vitrin bölümlerinde de kullanılacak (kart 0161). Kataloğun adlarını görmek ürünleri görme iznidir.
- **Öneri listesini yüzen kutu olarak açmak:** tasarım değerlerinde öneri kutusu için bir yükseklik yok. Ham değer yazmak yerine liste akışta durur.

## Bağımsız kontrolün bulgularıyla düzeltilenler

- Formda alanı olmayan iş kuralı hatası ("menü dolu", "menü sınırı", "kategori menüsü") genel uyarıya dönüşüp nedeni yutuluyordu: artık yalnız formda olan alanlar eşlenir, öteki hata kendi metniyle formun üstünde görünür. Menünün kodunun hatası adın altında görünür.
- Klavyeyle seçili öneri açık temada neredeyse görünmüyordu (1,08:1): seçili öneri yazının renginde zemin alır.
- Silme ve taşımadan sonra odak sayfanın başına düşüyordu: silinince komşu satıra (yoksa üstüne, o da yoksa "Öğe ekle"ye), taşınınca taşınan satıra geçer.
- Aynı adlı öğeler ve ürünler ayırt edilemiyordu: aynı listedeki aynı adlı öğeler sırayla adlandırılır ("…, 2. sıradaki"); ürün ve marka önerilerinde adres adı da yazar.
- Seçimden sonra yazı değişince form eski kaydı gönderiyordu: yazı seçili adın dışına çıkınca seçim bırakılır.
- Kutu öneri yokken de "açık" diyordu ve ilk Escape görünmeyen listeyi kapatıyordu: kutu yalnız öneriler görünürken açıktır.
- Kayıt aramada yetkisi olmayana nedeni yazılır.
- Adresteki büyük harfli menü kimliği tanınır (karar 0112). "kadın tişört" yol ayracına takılmadan "Kadın › Tişört"ü bulur. Uzun adlı menünün kodu sınırı aşmaz.
- Kategori yolu kategori modülündedir (`cekirdek/moduller/kategori/yol.ts`).
- Tam takımın yükünde vitrin bölümleri penceresi, form değişir değişmez basılan Escape'te sormadan kapandı: "değişti" bilgisi bir sonraki çizime kalıyordu. İki ekranın kopya "kaydedilmemiş değişiklik" sorusu ortak kancaya taşındı (`useKapatmaSorusu`, `cekirdek/yonetim-paneli/kapatma-sorusu.tsx`), bilgi çizimi beklemeden tutulur.
- Tailwind sınıf testi panelin alt klasörlerini de tarar; onay penceresinin klavyesi bileşen sahnesinin tarayıcı testindedir.

## Sonuçları

- Bir öğeyi başka bir öğenin altına almak sürüklemeyle yapılamaz, menü ya da form ister.
- Arama ürünlerin durumuna bakmaz: taslak ve arşivdeki ürün de seçilebilir. Panel öğenin "vitrinde görünmüyor" durumunu gösterir.
- Menüyü silmek ona başvuran vitrin bölümünü değiştirmez: bölüm menü olmadan görünmez. Onay penceresi bunu söyler.
- Ekranın altındaki satırda anlık bildirimler açılır menünün üstünde durabilir; klavyeyle açılan menü bundan etkilenmez.
