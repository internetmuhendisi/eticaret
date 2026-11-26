# 0315 · Excel ile toplu ürün işlemleri eklentisi

## Amaç

Ürünleri Excel dosyasıyla dışa ve içe aktarma temel pakette değildir; katalogdaki "Excel ile toplu ürün işlemleri" (`excel-ile-toplu-urun-islemleri`) eklentisidir ve derste "panelde toplu iş yapan eklenti" örneğidir (`temel-paket.md`). Tarifi henüz yazılmadı; `/eklenti-ekle` tarifsiz eklentide durur.

Bölüm: Yönetim paneli 2. Önce 0311 ve 0314 bitmiş olmalı.

## Olmazsa olmazlar

- Önce tarif `eklentiler/excel-ile-toplu-urun-islemleri.md` tarif biçimiyle yazılır (`eklentiler/README.md`), kullanıcıya gösterilir ve onaylanır; sonra `/eklenti-ekle excel-ile-toplu-urun-islemleri` ile kurulur.
- Dışa aktarma: ürünler, birleşimleri, fiyat, indirim, stok, kategori, marka, etiket, özellikler; listenin süzgeçleriyle.
- İçe aktarma: arka plan işinde, satır satır doğrulama önizlemesi (eklenecek, değişecek, hatalı satırlar ve nedenleri), onaydan sonra uygulama; her satır var olan servislerin kurallarıyla, değişiklik kaydı ve geçmişlerle; yarıda kalan iş yeniden başlatılabilir.
- Dosya güvenliği: boyut ve satır sınırı, formül hücresi dışa aktarmada etkisiz yazılır (CSV/formül enjeksiyonu), yalnız beklenen dosya türü.
- Eklenti kapalıyken ekranlar ve uçlar yoktur, veri korunur.

## Sınırlar

- Siparişleri Excel'e aktarma kart 0316'dadır (yeri kart 0311'in kararıyla).
- Başka sistemden veri taşıma ayrı eklentidir.

## Bitti sayılır

- Tarif onaylandı, plan `planlar/` klasöründe.
- Gerçek veritabanıyla dışa aktarılan dosyanın değiştirilmeden içe aktarılınca hiçbir şey değiştirmemesi, ekleme, değişiklik, hatalı satır, varyantlı ürün, sınırlar, formül hücresi, kapalı eklenti, iki site.
- Tarayıcıda klavyeyle dışa aktarma, dosya yükleme, önizleme ve sonuç; iki renkte ve üç genişlikte tarama.
- Tarifin "bitti sayılır" listesi tek tek kontrol edildi.
- Ekran görüntüsü taslakla yan yana kondu, farklar düzeltildi.
- Bağımsız kontrol yapıldı.

## Durum

yapılacak
