# 0169 · Sipariş listesinin süzgeçleri: tarih, bakılması gereken, kargo firması

## Tarih

2026-11-23

## Karar

Panelin sipariş listesine üç süzgeç eklendi (kart 0267, taslak: karar 0157):

- **Tarih:** siparişin oluşturulduğu gün. Hazır aralıklar (Bugün, Son 7 gün, Son 30 gün) ya da "Tarih seç" ile başlangıç ve bitiş günü; bir uç boş bırakılabilir. Günler sitenin saat dilimiyle sayılır, iki gün de dahildir.
- **Bakılması gereken:** durum sekmelerinin sonunda bir sekme. Havalesi bildirilmiş ve ödemesi beklenen, bekleyen iade talebi olan ve sonucu beklenen (kartla iade, kuruluşun cevabı bekleniyor) siparişleri toplar; satırda her birinin işareti durur. Kart 0239'un "İade talepleri" sekmesi bu sekmeye katıldı.
- **Kargo firması:** kullanıcı kararıyla (2026-11-23) bu karta eklendi. Seçenekler siparişlere kargoya verildiği anda yazılan firma adlarıdır; firma listesinden sonradan silinen ya da adı değişen firmanın siparişleri de eski adıyla bulunur.

Teknik kararlar:

- Liste motoruna iki süzgeç türü eklendi (`cekirdek/yonetim-paneli/liste/tanim.ts`): `tarih` (adreste `?tarih=son-7-gun` ya da `?tarih=2026-11-01_2026-11-21`, bir ucu boş olabilir) ve `deger` (seçenekleri sunucunun verdiği serbest metinler; adreste her değer ayrıca kodlanır, çünkü adında virgül olabilir). Tanınmayan, takvimde olmayan ve ters aralık yok sayılır; liste ucu reddeder.
- Hazır aralık adreste kodla durur ve sunucuda o günün takvim gününe göre çözülür: paylaşılan "Son 7 gün" bağlantısı ertesi gün de son 7 günü gösterir. Gün sitenin saat dilimindeki gece yarısında başlar (`gununBasi`); gece yarısının yaşanmadığı günde günün yaşanan ilk dakikası.
- Yayınlanmış bir süzgeç değeri kalkınca tanım eski değeri yenisine çevirir (`eskiDegerler`): `?durum=iade-talebi` "Bakılması gereken"i açar.
- Sekme sayıları sekmenin dışındaki bütün süzgeçlere (ödeme yöntemi, tarih, kargo firması) uyar; aranan metinden bağımsızdır.
- Tarih süzgecinin paneli kütüphanenin yeni parçasıdır: `AcilirPanel` (shadcn/ui popover, Radix Popover). Açılır menünün öğeleri yalnız seçimdir, içine form alanı konamaz.
- Panelde günler sunucunun biçimiyle yazılır (`gunYazilari`); tarayıcı tarih biçimlemez.
- Kayıt ve değer süzgeçlerinin değer sınırı tek yerdedir (`suzgecDegerSiniri`, `cekirdek/kayitlar/liste.ts`). Dilin harf sırası ürün listesinden ortak yere taşındı (`cekirdek/veritabani/harf-sirasi.ts`); kargo firmaları da onunla sıralanır.
- Taslaktaki toplu "Fiş yazdır" kart 0270'e kaldı: fiş sayfası orada yazılır.
- "Bakılması gereken" sekmesi yürüyen durumların (ödeme bekleniyor, hazırlanıyor, kargoda) hemen arkasındadır (taslak): şerit dar ekranda kayar, sona konan sekme kaydırmadan görünmüyordu. Liste motoru seçili sekmeyi şeridin görünen kısmına kaydırır (bütün listeler).

## Neden

- Mağaza sahibinin önce görmesi gereken işler (havale onayı, iade talebi, takılan iade) dağınık sekmelerdeydi; tek sekme taslağın "Bakılması gereken" düzenidir ve panonun (kart 0186) bağlantıları da buraya gelecektir.
- Tarih sitenin saat dilimiyle sayılmazsa İstanbul'da gece 00.00 ile 03.00 arasında verilen sipariş bir önceki güne düşerdi.
- Kargo firmasını siparişteki adla süzmek, firma listesi değiştiğinde eski siparişlerin süzülemez olmasını önler (sipariş kargo bilgisini kendinde saklar, karar 0145).
- Tarih ve değer türleri motorda olunca başka listeler (müşteriler, yorumlar) aynı süzgeci kopyalamadan kullanır (`.claude/rules/liste-motoru.md`).

## Düşünülen diğer yollar

- "İade talepleri" sekmesini koruyup "Bakılması gereken"i ayrıca eklemek: aynı siparişi iki sekmede saymak sekme şeridini uzatır, taslak tek sekme çizdi.
- Kargo firmasını firma listesinin kimliğiyle süzmek: siparişte kimlik değil ad saklanır; firma silinince ya da adı değişince eski siparişler bulunamazdı.
- Hazır aralığı adrese gün olarak yazmak (`2026-11-17_2026-11-23`): bağlantı ertesi gün "son 7 gün" olmaktan çıkardı.
- Tarih panelini açılır menüyle kurmak: menü öğesinin içine tarih alanı konamıyor (Radix menüsü klavyeyi öğeler arasında taşır).
- Tarihi tarayıcıda biçimlemek: panelin kuralı tutar ve tarihi sunucuda sitenin biçimiyle yazmaktır.

## Sonuçları

- Liste motorunun iki yeni türü ve bir yeni parça (`AcilirPanel`) bakım ister; testleri `liste-tanimi.test.ts`, `liste.test.tsx` ve katalogdadır.
- "İade talepleri" sekmesi kalktı; o sekmeye alışmış mağaza sahibi talepli siparişi "Bakılması gereken"de, işaretiyle bulur.
- Kargo firmaları süzgecinin seçenekleri her sayfa açılışında siparişlerden okunur (tekrarsız ad sorgusu); sipariş sayısı çok büyürse bu sorgu yavaşlayabilir, ölçülmedi.
- Sitenin bugünü, sayfanın ve liste ucunun çağrıldığı anda sitenin saat dilimiyle hesaplanır; gece yarısını geçen açık sayfada "Bugün" yenilenince yeni günü gösterir.
