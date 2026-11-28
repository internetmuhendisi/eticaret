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

## Durum

yapılacak
