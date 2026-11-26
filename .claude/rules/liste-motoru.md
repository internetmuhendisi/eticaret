---
paths:
  - "bilesenler/parcalar/tablo*.tsx"
  - "cekirdek/eklentiler/*/panel/**"
  - "cekirdek/yonetim-paneli/**"
  - "cekirdek/uygulama/app/yonetim/**"
  - "sahip-paneli/**"
---

# Liste, tablo, pano ve takvim motoru

- Ürün, sipariş, müşteri, kupon, iade gibi bütün listeleri tek ortak liste motorundan çıkar. Sayfada elle tablo kurma.
- Bir listenin sütunlarını, filtrelerini, sıralamasını ve toplu işlemlerini bir tanım dosyasında yaz. Sayfa yalnız tanımı çağırır.
- Aynı verinin tablo, kart, pano ve takvim görünümlerini aynı motordan üret. Elle pano ya da takvim kurma.
- Etkinlik geçmişi, bildirim akışı ve müşteri yazışmaları için kendi ortak motorlarını kullan. Her şeyi yapan tek dev motor yazma.
- Sunucunun döndürdüğü her anlamlı alan sütun olarak seçilebilsin. Dönmeyen alanı sütun yapma.
- Sunucunun kabul ettiği her filtre arayüzde olsun. Kabul etmediği filtreyi koyma.
- Bir sütunu ancak sunucu ona göre sıralayabiliyorsa sıralanabilir göster.
- Her listede yükleniyor, boş, filtreye uyan kayıt yok ve hata durumlarını ayrı göster.
- Bir listenin filtre düzeyini bilinçli seç: filtresiz, hazır filtreli ya da kullanıcının kendi filtresini kurup kaydedebildiği tam filtreli.
- Kullanıcının kaydettiği filtre ve sütun düzenlerini bütün listeler için aynı altyapıda tut.
- Düzenle, kopyala, sil gibi satır eylemlerini satırın sonunda tek küme olarak koy.
- Toplu işlemleri yalnız kayıt seçildiğinde göster ve yalnız seçilen kayıtlara uygula.
- Kategori, etiket, sipariş durumu gibi küçük listeleri aynı satır yapısı ve aynı sıralama yöntemiyle yönet.
- Motorun yapamadığı bir şey gerekiyorsa sayfaya kopya yazma, motoru genişlet.

## Yazılanlar (kart 0258, karar 0158)

- Listenin tanımı `ListeTanimi` ile yazılır (`cekirdek/yonetim-paneli/liste/tanim.ts`): süzgeçler (`sekme`, `secenekler`, `kayit`, `deger`, `tarih`), arama (`adreste` ya da değil), sıralamalar (ilki varsayılan), başlıktan sıralanabilen sütunlar, `sayfali`, toplu işlemler (her biri izniyle). Örnekler: `siparisler/liste-tanimi.ts`, `cekirdek/eklentiler/stoga-gelince-haber-ver/panel/liste-tanimi.ts`.
- Panel sayfası durumu `listeDurumunuOku` ile okur, liste ucu `listeUcuSemasi` ile; adres yalnız `listeAdresi` ile yazılır. Çok değerli süzgeç virgülle yazılır. Tanınmayan değer yok sayılır, sayfa sınıra çekilir.
- Ekran `Liste` ile çizilir (`cekirdek/yonetim-paneli/liste/liste.tsx`): listenin istemci dosyası sütunların hücrelerini, telefondaki kartın içini, metinleri ve toplu işlemlerin uç ve gövdesini verir. Sunucu yalnız biçimlenmiş satırları (`ListeVerisi`) verir; okunamazsa `null` (hata hâli) ve hata kaydedilir.
- Kişisel bilgi taşıyan arama adrese yazılmaz (`adreste: false`): ekran liste ucuna sorar; uç sayfayla aynı veri işlevini çağırır.
- Toplu işlemin ucu servisin toplu işlevini çağırır: her satır tekil işlemle aynı yoldan, kendi işleminde geçer, sonuç `TopluSonuc`'tur (`cekirdek/kayitlar/liste.ts`). En çok bir sayfa gönderilir. Ekran izni olmayan işlemi göstermez (sayfa `yetkili` ile süzer), uç yine denetler.
- Sayfa başına satır `panelSayfaBoyu` mağaza ayarıdır.
- Küçük tablolar `Tablo` parçalarıyla çizilir; sayfada `<table>` yazmak denetimde hatadır (`elle-tablo.grit`).
- Süzgecin seçenekleri sitenin kayıtlarıysa (kategori, marka) `tur: "kayit"` yazılır (kart 0262, karar 0161): tanım seçenek taşımaz, sayfa seçenekleri `kayitSecenekleri` ile verir; adreste ve uçta kimlikle durur, kimlik olmayan değer yok sayılır.
- Tarih süzgeci `tur: "tarih"` (kart 0267, karar 0169): tek değer, hazır aralık (`tarihHazirlari`'ndan, tanımın `secenekler`'inde) ya da iki gün (`2026-11-01_2026-11-21`, bir ucu boş olabilir). Hazır aralık sunucuda bugüne göre (`tarihSuzgecininGunleri`), gün sitenin saat dilimiyle (`gununBasi`) çözülür. Ekranda kendi panelidir (`TarihSuzgeci`, `liste/tarih-suzgeci.tsx`); şeritteki günlerin yazılışını sayfa verir (`gunYazilari`).
- Seçenekleri sunucunun verdiği serbest metinler (siparişlerdeki kargo firması adları) `tur: "deger"` ile yazılır: adreste her değer ayrıca kodlanır, en çok `degerEnCok` harf; sayfa seçenekleri `kayitSecenekleri` ile verir. Kayıt ve değer süzgecinin değer sınırı `suzgecDegerSiniri`'dir (`cekirdek/kayitlar/liste.ts`).
- Önizlemesi olan toplu işlem kendi penceresini açar (`tur: "pencere"`, kart 0314): pencere uçlara kendisi gider, sonucu `bitti(TopluSonuc)` ile listeye verir; sonuç ötekilerinki gibi listede söylenir, seçim yalnız işlenemeyen satırlarda kalır.
- Sunucuda bir şey değiştirmeyen toplu işlem bağlantıdır (`tur: "baglanti"`, kart 0270): seçilenlerden kurulan adresi yeni sekmede açar, onay sormaz, seçim kalır (siparişlerde "Fiş yazdır"). Tanımdaki izni açtığı sayfanınkidir.
- Yayınlanmış bir süzgeç değeri kalkınca tanımın `eskiDegerler`'i eski adresi yeni değere çevirir; adrese yalnız yeni değer yazılır.
- Sekmenin varsayılan değeri (`varsayilan`, kart 0277, karar 0174): liste o sekmeyle açılır, şeritte "Tümü" yoktur, değer adrese yazılmaz ve süzgeç sayılmaz (`suzgecliMi(durum, tanim)`). Sunucu `sekmeSayilari[""]`'de bütün sekmelerin toplamını verir: varsayılan sekme boşken öteki sekmelerde kayıt varsa arama ve süzgeçler durur.
- Uzun metin taşıyan liste her genişlikte kart çizer (`gorunum="kartlar"`, yorumlar): sütunlar kullanılmaz, sıralama yalnız menüdedir, sayfanın hepsini seçen kutu listenin üstündedir.
