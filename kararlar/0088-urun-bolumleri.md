# 0088 · Ürün bölümleri, ürün kaynağı ve geri sayımlı fırsatlar

## Tarih

2026-11-10

## Karar

Bölüm kütüphanesine ana sayfanın ürün gösteren dört bölümü girdi (kart 0111). Her biri yalnız ana sayfaya konur, iki görünümü vardır. Ürün kartı her yerde `UrunKarti`'dır (karar 0085). Kartın görünümü bölümün seçimidir; "temanın kartı" seçiliyse temanınki kullanılır.

- **Ürün vitrini.**
  - Alanları: başlık, ürün kaynağı (en çok 12 ürün), "Tümünü gör" bağlantısı, kart görünümü ve isteğe bağlı yan afiş (başlık, metin, görsel, düğme).
  - Görünümler: ızgara ve kaydırmalı şerit.
- **Sekmeli vitrin.**
  - İki ile altı arasında sekme olur; her sekmenin kendi başlığı ve kaynağı vardır.
  - Ürünü olmayan sekme görünmez. Tek sekme kalırsa sekme çizilmez, onun başlığı bölümün başlığı olur.
  - Sekmeler ortak `Sekmeler` parçasıyla çizilir: ok tuşları sekmeler arasında gezer, Tab ürünlere geçer.
- **Geri sayımlı fırsatlar.**
  - Kullanıcının kararıyla temel pakettedir. Katalogdaki "Geri sayım" eklentisi ürün sayfası ve öteki yerler için kalır.
  - Bölüm bir kaynak seçmez: bitişi olan süren indirimleri, en yakın biteni önce gösterir. Mağaza sahibi yalnız kaç ürün gösterileceğini seçer (2, 4, 6, 8).
  - Bitiş çekirdeğin indiriminden gelir, elle girilmez.
  - Yan panelli görünümde zemin renginde panel vardır: üst yazı, başlık ve en yakın bitişe gün, saat ve dakika sayacı. Panelsiz görünümde başlık ve sayaç üsttedir. Her kartın üstünde kendi kalan süresi yazar ("Bitmesine 2 gün 5 saat").
- **Marka logoları.**
  - Bir ile on iki arasında marka seçilir. Her kutu markanın sayfasına bağlıdır; logonun alternatif metni markanın adıdır.
  - Görünümler: ızgara (masaüstünde 5, telefonda 2 sütun) ve kaydırmalı şerit.
  - Markaya logo alanı eklendi (veritabanı değişikliği 0029). Logo dosya deposundan gelir ve hazır bir görsel olmalıdır (kategori görseliyle aynı kural, karar 0087). Değişikliği kayda girer. Logo vitrin görseli ucundan gelir: silinmemiş markanın logosu verilir.

**Kullanıcı kararları (fırsatlar ve markalar).**

- Süresiz indirim (bitiş tarihi yok) fırsatlarda görünmez. Bu ürünler "indirimdekiler" kaynağıyla ürün vitrininde gösterilebilir.
- Seçenekleri farklı günlerde biten üründe kartta satılabilir birleşimlerden indirimi en erken biteninki görünür. O bitince kart bir sonrakine geçer.
- Ziyaretçi sayfadayken sayaç sıfıra inerse kart bölümden kalkar, ekranda eski indirimli fiyat kalmaz. Son kart da kalkarsa bölüm kalkar.
- Logosu olmayan markanın adı kutuda başlık yazı tipiyle görünür.

**Ürün kaynağı.** Ürün gösteren her bölüm ürünlerini tek işlevden alır (`kaynaklarinUrunleri`, `cekirdek/vitrin/urun-kaynagi.ts`). Kaynak türleri şunlardır:

- elle seçilen ürünler (seçim sırasıyla; aynı ürün harf farkıyla da iki kez seçilemez)
- kategori (alt kategorileriyle)
- marka
- etiket
- yeni gelenler
- indirimdekiler (indirimi kartta görünen, yani rozeti olan ürünler)

Fırsatların kaynağı mağaza sahibinin seçtiği bir alan değildir. Bölüm tarifi onu `firsatAdedi` ile ister.

- Yalnız vitrinde liste yerinde görünen ürünler gelir (`vitrinKosulu`): taslak, gizli, arşiv, silinmiş ve zamanı gelmemiş ürün gelmez. Tükenen ürün mağaza sahibinin ayarına uyar. Süzme sorgudadır, görünmeyen ürün adedi doldurmaz.
- Her kaynak tek sorguyla süzülür (var olan liste sorguları, sıra en yeni önce). Bütün kaynakların kartları birlikte `urunKartlari` ile gelir. Sorgu sayısı ürün sayısıyla artmaz. Aynı kaynak iki bölümde bir kez okunur.
- İndirimdeki ürünün liste koşulu `indirimdekiUrunKosulu`'dur (`cekirdek/moduller/fiyat/vitrin.ts`). Kuralı `indirimSuruyorMu` ile aynıdır, test ikisini karşılaştırır. Yalnız silinmemiş birimler ve sitenin bugünkü para birimindeki fiyatlar sayılır.
- **Görünen indirim tek ölçüdür:** kartta rozeti çıkaran ölçü, yani oranı en az %1 olan aday (karar 0085). Eski fiyatı gösterilemeyen indirim (30 gün kuralı, karar 0067) kartta düz fiyattır; ona geri sayılmaz, "indirimdekiler"e de girmez. Böylece sayaç, liste ve kart aynı şeyi söyler.
- Fırsatlarda sıra ve bitiş kartın fiyatından gelir. Geçerli fiyat, gösterilecek fiyat ve fiyat aralığı indirimin bitişini taşır (`indirimBitisi`). Aralıktaki bitiş, aralığın adaylarının (satılabilir birleşimler, hiçbiri satılamıyorsa hepsi) kartta görünen indirimlerinin en yakın bitişidir. Kartında bitiş olmayan ürün fırsatlara girmez.
- "İndirimdekiler" ve fırsatlarda aday listenin sınırı sayfanın en büyük boyutudur (100): süzme kartın fiyatından yapılır, sonra adet kadarı alınır.
- Vitrin bağlamı kaynakların kartlarını anahtarıyla, seçilen markaları ve bağlamın okunduğu anı taşır. Bölüm veritabanına gitmez.

**Geri sayımın tarayıcıdaki davranışı.**

- Sunucu bağlamın anıyla çizer, ilk çizim tarayıcıda aynıdır. Sonra saat tarayıcının saatine geçer.
- Saat saniyede bir değil, yalnız ekranda bir şey değişeceği anda yeniden kurulur: bir kartın dakikası azalınca ya da indirimi bitince.
- Arka plandaki sekmede zamanlayıcı gecikebilir: sekme yeniden görünür olunca saat hemen tazelenir.
- Sıfır olan küçük birim yazılmaz: "2 gün", "1 saat", "40 dakika".
- Sayaç `role="timer"`dır: ekran okuyucu her değişimi okumaz. Ekran dakikada bir değişir, hareket yoktur.

**Yerleşim (Canlı Çarşı taslağına göre).**

- Dikey kartlar masaüstünde dört, tablette üç, telefonda iki sütundur; yan afişin yanında bir sütun azdır.
- Yatay kartlar masaüstünde üç, tablette iki, telefonda bir sütundur. Dört sütunda fiyat kırılıyordu (görüntüde ölçüldü).
- Fırsatlarda yan panelin yanındaki kartlar iki sütundur (taslaktaki gibi). Telefonda panel kartların üstüne iner.
- Yan afiş ve fırsat paneli masaüstünde yeni tasarım değeri `panel` genişliğindedir (16rem). Karekodun genişliğinden okunmaz.

## Neden

- Fiyat, oran, stok ve bitiş çekirdeğin tek işlevlerinden gelmeli (karar 0066, 0067, 0071). Bitişi kartın fiyat aralığına koymak, kartın gösterdiği indirimle sayacın birbirini tutmasını sağlar. Ayrı bir bitiş hesabı satılamayan birleşimin bitişini sayabilirdi.
- Süzmeyi sorguda yapmak gerekti. Kartta süzülseydi, en yeni ürünler taslaksa bölüm adedinden az ürün gösterirdi.
- Saat tarayıcıda yalnız değişim anında kurulur. Saniyede bir çizim, sayfa açık kaldıkça boşuna iş yapıyordu; saat ilerletilerek yapılan tarayıcı testi de bu yüzden süre aşıyordu (ölçüldü).
- Logo için kategori görseliyle aynı yol (dosya deposu, hazır görsel denetimi, vitrin görseli ucu) seçildi. İkinci bir görsel yolu açılmadı.

## Düşünülen diğer yollar

- **Fırsat bölümünde bitiş tarihini elle girmek:** Kart bunu yasaklar. İndirim bittiğinde sayaç ile fiyat ayrışırdı.
- **Fırsatların sırasını sorguda kurmak:** Satılabilir birleşim kuralı sorguda ikinci kez yazılırdı. Aday listesi sınırlı tutulup sıra kartın bitişinden kuruldu.
- **Logoyu yalnız marka tablosuna, ayrı tablo tanımıyla eklemek:** Marka ve etiket aynı tablo biçimini kullanır (karar 0064). Alan iki grupta da açıldı, etikette girilmez (açıklama alanıyla aynı yol).
- **Sekmelerin bütün içeriğini sayfada gizli tutmak:** Radix'in sekmesi seçili olmayan içeriği çizmez, köşeli parantezli durum sınıfı da denetimde yasaktır. İçerik sunucuda hazırdır, sekme değişince bekleme olmaz.

## Bağımsız kontrolün bulguları

Düzeltilenler:

- Eski fiyatı gösterilemeyen indirimde kart düz fiyat gösteriyor, ama fırsatlarda üstünde geri sayım yazıyordu. Aynı ürün "indirimdekiler"e de giriyordu. İndirimi yalnız satılamayan birleşimde olan ürün de "indirimdekiler"e giriyordu. Görünen indirim tek ölçüye bağlandı (yukarıda).
- Aynı ürün elle seçimde harf farkıyla iki kez seçilebiliyor, vitrinde çift görünüyordu. Şema harf ayrımsız denetler; kaynak da tekilleştirir.
- Arka plandaki sekmede biten kart bir dakikaya kadar görünebiliyordu: sekme görünür olunca saat tazelenir.
- Tam saatlerde "2 gün 0 saat" yazıyordu.
- Panel genişliği karekodun genişliğinden okunuyordu.
- Testlere eklendi: "indirimdekiler" ve fırsatlarda taslak, arşiv, silinmiş ve zamanlanmış ürün; sorgu sayısı yedi kaynak türünde.

Bilerek bırakılanlar:

- Fırsat adayları "en yeni 100" üründür, "en yakın biten 100" değil (aşağıda).
- Vitrin görseli ucu silinmemiş her markanın logosunu verir, yalnız düzende seçilenleri değil. Marka değiştirme izni olan biri hazır herhangi bir görseli (taslak ürünün galeri görseli gibi) logo yapıp bu adresle açabilir. Kategori görselinde de aynı sınır vardır (karar 0087). İzin yalnız tam yetkili rollerdedir.
- Logo denetiminin aynı anda silinen dosyayla yarışı ve boyutu eksik görsel ayrıca testte yoktur. Denetim kategori görseliyle aynı işlevdir (`gorselHazirMi`, paylaşımlı kilit); orada testlidir.

## Sonuçları

- Çekirdek 0.44.0 oldu. Veritabanı değişikliği 0029 (`markalar.logo_kimligi`, `etiketler.logo_kimligi`) uygulanmalıdır. Marka logosunu panelden seçmek panel ekranlarıyla gelir; bugün servisle yazılır.
- Marka sayfası ve kategori sayfası yazılmadı (Vitrin bölümü). Marka kutusunun bağlantısı bugün sayfası olmayan adrese gider; kategori kutularıyla aynıdır.
- Fırsat ve "indirimdekiler" adayları en çok 100 üründür (en yeni önce). Yüzden çok ürün aynı anda indirimdeyse, kartta indirimi görünmeyenler de yer kaplar ve en yakın biten eski ürün bölüme girmeyebilir. 5–30 mağazanın kataloğunda ölçülmedi.
- Bitişi olmayan fırsat kartının görünüşte ayrıca süzülmesi ikinci katmandır: kaldırılınca kart biten kart kuralıyla yine çizilmez, bozması testte kırmızıya düşmez.
- Başlangıç düzeni kayda başvuramaz (karar 0081): elle, kategori, marka ve etiket kaynağı ile marka seçimi başlangıçta kullanılamaz; yeni gelenler, indirimdekiler ve fırsatlar kullanılabilir. Örnek Mağaza'nın ürün bölümleri kart 0114 ile gelir.
- Katalogda örnek bitişler sayfanın açıldığı ana göre kurulur (40 dakika, 3 saat 20 dakika, 2 gün 5 saat, 6 gün); katalog açık kaldıkça kartlar düşer.
- Kural: `.claude/rules/vitrin.md`.
