# 0345 · Demo paketi

## Amaç

Tema ile demo ayrı kavramlardır. Tema vitrinin görünüşüdür (karar 0080, 0092). Demo bir sektöre özel, dolu bir mağazadır: kategoriler, ürünler ve görselleri, menüler, ana sayfa düzeni, sayfalar, blog, önerilen tema. Bugün bu içerik her sitenin kendi `baslangic/` klasöründedir ve yalnız boş veritabanına bir kez yazılır (karar 0070, 0094). Demo bir pakete dönüşmeli: yeni site onunla başlayabilsin (kart 0350), açık bir mağaza panelden onu içe aktarabilsin (kart 0347, 0348). Örnek Mağaza'nın içeriği ilk paket olur (demo1).

Bölüm: Yeni mağaza. Önce 0343 bitmiş olmalı.

## Olmazsa olmazlar

- Paketin biçimi: kodu, adı, sektörü, kısa açıklaması, önizleme görseli, önerilen tema ve düzeni; katalog, görseller, menüler, düzen, sayfalar, blog, kuponlar. Mağazanın kendisine ait olanlar pakette yoktur: mağaza adı, logo, iletişim ve satıcı bilgileri, ödeme ve kargo ayarları, vergi, e-posta metinleri, ekip. Hangi parçanın pakette olduğu bir listede tek yerde yazılır; kart 0347 aynı listeyi okur.
- Paketlerin yeri klasör düzenine yazılır (`.claude/rules/klasor-duzeni.md` ve kural dosyalarının `paths` satırları aynı değişiklikte). Paket çekirdeğin parçasıdır ya da ayrı sürümlenir; seçim gerekçesiyle karar kaydına yazılır (kural 3: çekirdekteki değişiklik hiçbir siteye kendiliğinden gitmez; paketin yeni hâli kurulu mağazayı değiştirmez).
- Paketin doğrulaması bugünkü site doğrulamasının başlangıç denetimlerini kullanır (katalog, galeri, düzen ve adres adı, menüler, sayfalar, görsel dosyaları); bozuk örnekleriyle. Paket hiçbir siteye, mağaza adına ya da sitenin koduna başvuramaz (kural 1; `site-adi-yok.test.ts` paketleri de tarar).
- Örnek Mağaza'nın içeriği `demo1` paketine taşınır, Örnek Mağaza paketten başlar; boş veritabanında kurulan Örnek Mağaza bugünküyle aynı kataloğu, menüleri, düzeni, sayfaları, blogu ve kuponları alır (`siteler/ornek-magaza/testler/` değişmeden geçer). Tema Galerisi de aynı paketten başlar (karar 0127: Örnek Mağaza'nın kopyası).
- Paketin içeriğinin sitenin diline ve para birimine bağlılığı yazılır: bugün paketler Türkçe ve TL'dir; başka ülkede kurulacak site için ne olacağı (kod ülkeye bağlı yazılmaz) karar kaydında.
- Siteye özel kodu çekirdeğe sokmaz; sitenin `baslangic/` klasöründe pakette olmayan parçalar (ayarlar, vergi, tema seçimi) kalır.

## Sınırlar

- Panelden içe aktarma kart 0347 ve 0348'dedir; bu kart yalnız boş veritabanına kurulumu paketten yapar.
- Elektronik demosu kart 0349'dadır.
- Örnek Mağaza'nın canlı veritabanı değişmez; yayın kart 0351'dedir.

## Bitti sayılır

- Karar kaydı (paketin yeri, sürümü, parçaların listesi, dil ve para birimi) yazıldı.
- `demo1` paketi doğrulamadan geçiyor, bozuk örnekleri kırmızı.
- Örnek Mağaza ve Tema Galerisi paketten başlıyor; sitelerin testleri değişmeden yeşil; boş veritabanında kurulum bugünkü sonuçla aynı (test).
- Klasör düzeni ve `paths` satırları güncel.

## Durum

yapılacak
