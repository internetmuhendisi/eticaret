# 0349 · Elektronik mağazası demosu (demo2, VOLTIS)

## Amaç

Sektöre özel ikinci demo: bir elektronik mağazası. Marka uydurmadır: VOLTIS. Demonun bütün içeriği ve görselleri kart 0345'in paketindedir; Demolar ekranında (kart 0348) ve "Yeni site kur"da (kart 0350) seçilebilir.

Bölüm: Yeni mağaza. Önce 0345 bitmiş olmalı ve kullanıcı görsel paketini vermiş olmalı (kullanıcı kararı, 2026-11-28: görselleri paket olarak kullanıcı verir, bu karta gelince).

## Olmazsa olmazlar

- İşe başlamadan kullanıcıdan görsel paketi istenir ve sorulur: kategori ağacı ve ürün sayısı, önerilen tema, ana sayfanın bölümleri. Gerçek bir markayı, ürünü, logoyu ya da fotoğrafı taklit eden içerik kullanılmaz; ürün adları VOLTIS ve uydurma model adlarıdır, başka hiçbir gerçek marka geçmez.
- Katalog demo1'in gösterdiği yapıları da gösterir: seçenekli ürün (renk, depolama gibi), özellikler (dört tür), indirim ve fırsat, düşük stok ve tükenmiş birleşim, ilgili ürünler, yorumlar, blog, sayfalar, menüler, kampanya ve kuponlar. Elektronik ürüne özgü bilgiler (garanti süresi, teknik özellik tablosu) var olan özellik yapısıyla verilir; yeni çekirdek alanı gerekiyorsa ayrı kart açılır.
- Görsel paketi açılmadan önce içeriği listelenir: her dosyanın türü, boyutu ve nerede kullanılacağı; uygun olmayan dosya kullanıcıya söylenir (kart 0115'in kuralı). Görsellerin kaynağı ve kullanım hakkı belgeye yazılır.
- Paket doğrulamadan geçer; boş veritabanına kurulunca her durumu (Örnek Mağaza'nın `KURALLAR.md` tablolarındaki gibi) sabit zamanla test eden demo testleri.
- Vitrinin her sayfa türü bu demoyla, önerilen temada, telefon ve bilgisayar genişliğinde, açık ve koyu temada açılır; ekran görüntüsü temanın taslağıyla yan yana konur, farklar düzeltilir. Hız ölçümünün kod sınırı ve ana içerik hedefi aşılmaz (görsel boyutları).
- Paket boyutu ölçülür ve yazılır (demo1'in görselleri 36 MB); çekirdek görüntüsüne giriyorsa görüntü boyutuna etkisi.

## Sınırlar

- Elektronik için yeni bir tema çizilmez; var olan hazır temalardan biri kullanılır.
- Çekirdeğe sektöre özel kod girmez (kural 1).

## Bitti sayılır

- Kullanıcı içerik ve görsel kaynağını onayladı; kaynaklar belgede.
- `demo2` doğrulamadan ve demo testlerinden geçiyor.
- Vitrin karşılaştırması yapıldı, farklar kartta; hız ölçümü yeşil.

## Durum

yapılacak
