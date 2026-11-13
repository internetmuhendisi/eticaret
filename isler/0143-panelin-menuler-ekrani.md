# 0143 · Panelin menüler ekranı

## Amaç

Mağaza sahibi ana menüyü ve alt bilgi bağlantılarını panelden düzenler. Menü servisi var (kart 0107), uçları ve ekranı yok.

Bölüm: Vitrin. Önce 0141 ve 0142 bitmiş olmalı.

## Olmazsa olmazlar

- Menü uçları: menüleri ve öğeleri okuma, ekleme, değiştirme, taşıma, sıralama, silme; izinler `menu.gor` ve `menu.degistir`, uç belgesi ve erişim testi.
- Öğe hedefi kategori, marka, ürün, sitenin kendi adresi, dış adres ya da başlık olarak seçilir; kayıt arayarak seçilir.
- Derinlik sınırı (2) ekranda da tutar; sınırı aşan taşıma seçeneği sunulmaz.
- Hedefi silinmiş ya da görünmeyen öğe ekranda işaretli görünür (servisin bilgisi).
- Kategori menüsü ağaçtan gelir, öğe eklenemez; ekranda bu açıklanır.
- Sıralama ve taşıma sürükleyerek ve klavyeyle yapılır.
- Taslakla karşılaştırma: ekran görüntüsü taslakla yan yana, iki temada, telefon ve bilgisayarda; farklar düzeltilir ya da nedeni kullanıcıya söylenir.

## Sınırlar

- Menü kuralları (derinlik, hedef türleri, sınırlar) değişmez.

## Bitti sayılır

- Mağaza sahibi tarayıcıda öğe ekliyor, taşıyor, sıralıyor, siliyor; değişiklik vitrinin menüsünde görünüyor (tarayıcı testi).
- Görevli ve yetkisiz yönetici uçlarda reddediliyor (erişim testi).
- Ekran klavyeyle kullanılıyor, iki temada ve üç genişlikte taramadan geçiyor.
- Taslakla karşılaştırma yapıldı.

## Notlar (2026-11-13)

- Düzey değiştirme satır menüsünden ("Şunun altına taşı", "En üst düzeye çıkar") ya da formdaki "Üst öğe" seçimiyle yapılır; sürükleyerek yalnız aynı düzeyde sıralanır (kullanıcı kararı, karar 0116).
- Kayıt arama ortak parçadır (`KayitArama`, uç `kayit-ara`); kart 0161 onu vitrin bölümlerinin formuna bağlar. Silme ortak onay penceresiyle sorulur (`OnayPenceresi`, kütüphanede yeni).
- Taslakla karşılaştırma: adres hedefi taslaktaki gibi "Sitenin sayfası" ve "Dış bağlantı" olarak ayrıldı, öğe metninin yer tutucusu kaydın adı. Kalan farklar: menü listesinde öğe sayısı ve "menü satırında" gibi kullanıldığı yer yazmıyor (tür yazıyor); alt öğeler taslaktaki gibi aynı listede girintili değil, kendi sıralanabilir listesindedir (kardeş sırası o listede); zamanlanmış ürünün öğesinde tarih yerine "Vitrinde görünmüyor" ve açıklaması var (servis yayın zamanını vermiyor); öneri satırında kaydın ürün sayısı yok; yeni öğenin düğmesi "Ekle" yerine "Kaydet ve yayınla" (değişiklik hemen yayınlanır).
- Açılan kart: 0165 (sıralanabilir liste testi animasyon sırasında ölçüyor; ana dalda da 8 denemede 3 kırmızı, ölçüldü).

## Durum

yapılacak
