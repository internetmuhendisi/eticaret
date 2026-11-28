# 0346 · Demolar ekranının ve içe aktarmanın taslağı

## Amaç

Panelde yeni bir Demolar ekranı gelecek (kart 0348): mağaza sahibi sektör demolarını görür, birini içe aktarır, "örnek verileri de aktar" seçer, sonra başka bir demoya ya da önceki hâline geçer. Onaylanan panel taslaklarında (karar 0157, 0185) bu ekran yok. Ekran kartı kendi görüntüsünü taslakla yan yana koyacağı için önce taslak çizilir ve onaylanır (kart 0311 ile aynı yol). İçe aktarmanın davranışı da ürün kararıdır ve kod yazılmadan önce kararlaştırılır.

Bölüm: Yeni mağaza. Önce 0345 bitmiş olmalı (paketin parçaları belli olmalı).

## Olmazsa olmazlar

- Canlı Çarşı'nın değerleriyle, var olan taslaklarla aynı düzende (`planlar/tasarim-yonu/panel-3.html` gibi) şunlar çizilir: Demolar listesi (önizleme görseli, ad, sektör, kısa açıklama, kurulu demo işareti, "Demoyu gez"), içe aktarma penceresi (aktarılacak ve korunacak parçalar, "örnek verileri de aktar", temanın da değişip değişmeyeceği, onay), ilerleme ve sonuç, önceki hâline dönüş, hata hâlleri; telefon ve bilgisayar genişliğinde, açık ve koyu temada. Vitrinde "(örnek)" ekli bir ürün kartı ve ürün sayfası.
- İçerik demo1 ve demo2'nin (kart 0349) gerçek içeriğinden gelir; demo2'nin içeriği yoksa yer tutucu olduğu açıkça belli olur.
- Ürün kararı gereken yerler taslakta seçenek olarak gösterilir ve kullanıcıya sorulur; en az:
  - "örnek veriler" neyi kapsar (ürünler, kategoriler, markalar, blog, sayfalar, kuponlar) ve işaretsizken ne aktarılır (yalnız düzen, menüler, tema mı);
  - "(örnek)" eki nerede görünür (ürün adı; kategori, marka, blog yazısı da mı), mağaza sahibi eki silerse ürün örnek sayılmaya devam eder mi;
  - "mağazanın ayarları ve içerikleri her zaman korunur": mağaza sahibinin kendi eklediği ürün, kategori, menü öğesi, bölüm ve sayfanın içe aktarmada ve demolar arası geçişte nasıl korunduğu (yanına mı eklenir, düzen ve menüler mi yer değiştirir);
  - "demolar arasında geri geçilebilir": geçişte önceki demonun örnek verilerinin kaldırılıp kaldırılmadığı; örnek ürün sipariş almışsa, yorum ya da favori almışsa, mağaza sahibi değiştirmişse ne olur; "önceki hâline dön"ün neyi geri getirdiği ve ne kadar geriye gittiği;
  - örnek ürünlerin vitrinde satılabilir olup olmadığı (sepete eklenir mi), arama motoruna açık sitede görünüp görünmediği;
  - içe aktarmanın kim tarafından yapılabildiği (yalnız mağaza sahibi mi) ve teslim edilmiş, satışta olan mağazada açık olup olmadığı;
  - "Demoyu gez": demonun gezilebilir bir sitesi mi (Tema Galerisi gibi, karar 0127) yoksa yalnız önizleme görselleri mi.
- Siteden siteye değişebilecek davranış kullanıcıya karar olarak sorulmaz; varsayılanıyla site ayarı olarak önerilir ve Örnek Mağaza için hangi değerin önerildiği söylenir (`CLAUDE.md`, Roller). En az: Demolar ekranının bu sitede açık olup olmadığı, mağaza sahibinin kullanabileceği demoların listesi.

## Sınırlar

- Ürün kodu yazılmaz. Taslak kaynak değil, karşılaştırma ölçüsüdür (karar 0075).
- Var olan taslaklar değişmez.
- "Yeni site kur" komutu bir komut satırı işidir, ekranı çizilmez.

## Bitti sayılır

- Listelenen her ekran ve hâl taslakta iki genişlikte ve iki temada var.
- Taslak sayfa hatası, yana kayma ve axe taraması (WCAG 2.2 AA) olmadan açılıyor; basılan alanlar gerçek panelle aynı ölçüde.
- Kullanıcı taslağı onayladı, ürün kararları bir karar kaydına yazıldı, önerilen site ayarları `planlar/site-ayarlari.md` tablosuna girdi.

## Sonuç

- **Taslak.** `planlar/tasarim-yonu/panel-3.html`: Demolar ekranı (liste, içe aktarma penceresi, satıştaki mağaza, içe aktarılıyor, sonuç, önceki hâline dön, içe aktarılamadı) ve vitrinde örnek ürün (kategori sayfası, ürün sayfası). Stiller ve yardımcılar `panel-2.html`'den alındı, o dosya değişmedi.
  - demo1 paketin gerçek içeriğiyle (21 ürün, 5 kategori, 3 blog yazısı, 3 sayfa, 4 kupon), demo2 köşeli parantezli yer tutucuyla (kart 0349).
  - Demolar panel menüsünün Vitrin grubunda.
- **Kararlar (2026-11-28), karar 0204.**
  - Kullanıcı önerilen seçeneklerin hepsini onayladı.
  - Örnek veriler bütün içeriği kapsar. "(örnek)" eki yalnız ürün adındadır. Düzen ve menüler demonunkiyle değişir, tema pencerede sorulur.
  - Başka demoya geçişte dokunulmamış örnekler kalkar. Düzenlenen örnek ürün mağazanın olur.
  - "Önceki hâline dön" son içe aktarmayı geri alır. Satıştaki mağazaya demo örneksiz aktarılır.
  - İçe aktarmayı yalnız mağaza sahibi yapar. "Demoyu gez" önizleme görselleridir.
  - Örnek ürün uyarıyla satılır, arama motorlarına kapalıdır.
  - Site ayarları `planlar/site-ayarlari.md`'de: Demolar ekranı (varsayılan açık, Örnek Mağaza açık), kullanılabilecek demolar (varsayılan bütün demolar, Örnek Mağaza bütün demolar).
- **Ölçümler.** 43 hâl iki temada ve iki genişlikte tarayıcıda açıldı; sayfa hatası, yüklenmeyen görsel, yana kayma ve axe taraması (WCAG 2.2 AA) temiz. İçerikteki her düğme, bağlantı düğmesi, anahtar ve seçenek altı hâlde iki genişlikte en az 44 px (gerçek paneldeki gibi; ölçüm). `pnpm denetim` temiz.
  - Ölçümün ilk turunda vitrin kartının adı tek satırda 24 px'in altında kaldı. Ürün kartı gibi ad bağlantısı kartın bütününe yayıldı (kart 0129).
  - Ürün sayfasında galeri boş görünüyordu; görüntüde fark edilip tek sütuna alındı.
  - İlk kayıt denemesinde kayıt öncesi denetim taslaktaki kullanılmayan yardımcıları ve stil sırasını yakaladı; yardımcılar silindi, taslağın kendi stil bloğuna gerekçeli muafiyet yazıldı.
- **Sonraki kartlara.**
  - Var olan altı taslak görselleri kart 0345'ten beri olmayan klasörden okuyor: kart 0354 açıldı.
  - Önizleme görsellerinin (ana sayfa, kategori, ürün sayfası) pakete eklenmesi ve içe aktarma kart 0347'de, ekran kart 0348'de.

## Durum

bitti
