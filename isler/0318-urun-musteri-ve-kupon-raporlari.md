# 0318 · Ürün, müşteri ve kupon raporları

## Amaç

Satış raporunun yanında mağaza sahibi hangi ürünlerin sattığını, müşterilerinin nasıl alışveriş yaptığını ve kuponlarının ne getirdiğini tarih aralığıyla görebilmeli.

Bölüm: Yönetim paneli 2. Önce 0317 ve 0313 bitmiş olmalı.

## Olmazsa olmazlar

- Kart 0317'nin rapor servisi ve tarih aralığıyla.
- Ürün raporu: ürün ve birleşim başına satış adedi, tutar, iade adedi; çok satanlar; silinmiş ürün siparişteki adıyla.
- Müşteri raporu: yeni ve dönen müşteri, en çok alışveriş yapanlar (yalnız üyeler; kişisel bilgisi silinmiş sipariş sayılır ama ad taşımaz), müşteri ayrıntısına bağlantı.
- Kupon raporu: kupon başına kullanım, indirim tutarı, kuponlu ciro, iade sonrası net.
- Her rapor CSV ile indirilir.

## Sınırlar

- Müşteri yaşam boyu değeri ve kâr raporları eklentidir.

## Bitti sayılır

- Gerçek veritabanıyla her raporun elle hesaplanmış örneklerle aynı olması, iade ve iptal, silinmiş ürün ve kişisel veri, CSV, izin, iki site.
- Tarayıcıda klavyeyle; iki renkte ve üç genişlikte tarama.
- Her yeni denetim bilerek bozularak kırmızıya düşüyor.
- Ekran görüntüsü taslakla yan yana kondu, farklar düzeltildi.
- Bağımsız kontrol yapıldı.

## Sonuç

- Raporlar ekranında Ürünler, Müşteriler ve Kuponlar sekmeleri (karar 0196); sayma kuralı tek dosyada (`cekirdek/moduller/rapor/kural.ts`), satış raporuyla aynı. İzin `rapor.gor` (yalnız mağaza sahibi, kullanıcı kararı).
- CSV dört rapor için tek uç (`rapor-csv`); müşteri raporunun indirmesi değişiklik kaydına girer.
- Sekme şeridi ortak kütüphaneye taşındı (`SekmeBaglantilari`), ekip ekranı da kullanır.
- 100 bin siparişte 30 günlük raporlar 5–37 ms, bir yıllık 43–63 ms; yeni indeks gerekmedi.
- Testler ve bozmalar `.claude/rules/kurallari-koruyan-kontroller.md`'de (kart 0318): 32 denetimin hepsi bozulunca kırmızı.
- Bağımsız kontrolün dört bulgusu düzeldi: ödenmemiş siparişin iptali ürün raporunda iade sayılıyordu, kupon raporu geri verilen kullanımı sayıyordu, ürün adı rastgele birleşimden alınıyordu, müşteri raporunun notu eksikti.

## Durum

yapılacak
