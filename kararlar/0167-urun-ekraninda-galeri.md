# 0167 · Ürün ekranında galeri: önce yükleme, kayıtla bağlama

## Tarih

2026-11-22

## Karar

Ürün ekranının "Görseller ve video" bölümü (kart 0266) ürünün tek formunun alanıdır (karar 0162). Seçilen görseller hemen, tek tek yükleme ucuna (`urun-gorseli-yukle`) gider ve dosya olarak kaydedilir; galeriye bağlanmaları, sıralama, alternatif metin, silme ve video bağlantısı ürünün "Kaydet"iyle, ürünle aynı işlemde yazılır (`panelGaleriYaz`). Ekran gördüğü kayıtlı öğeleri gönderir; arada başka yerden galeri değiştiyse kayıt çakışır (`galeri-degisti`), hiçbir şey yazılmaz.

En uzun kenarı 800 pikselden kısa görsel reddedilmez; galeride "Küçük görsel: vitrinde bulanık görünebilir." uyarısı görünür (kullanıcı kararı). Eşik `galeriOnerilenEnAz` kaydındadır.

## Neden

- Dosya kaydı veritabanı işleminin içinde yapılamaz (karar 0058, 0073): görselin boyutları diske yazılır. Görseli kayıtta yüklemek "Kaydet"i dosya sayısı kadar uzatır, ilerleme ve iptal gösterilemezdi.
- Galerinin formun bir alanı olması ekranın tek "Kaydet" ve "Vazgeç" düzenini korur; Vazgeç yüklenen görselleri de geri alır.
- Küçük görseli reddetmek mağaza sahibini elindeki tek görselle ürün açamaz hâle getirirdi; uyarı kararı ona bırakır.

## Düşünülen diğer yollar

- Her işlemin (yükleme, sıralama, silme) hemen kendi ucuyla kaydedilmesi: ekranda iki ayrı kayıt düzeni olurdu, Vazgeç galeriyi geri alamazdı.
- Görselin kayıtta, ürünle birlikte gönderilmesi: işlem içinde dosya yazılamaz, büyük gövdeli tek istek iptal edilemez.
- 800 pikselden küçük görselin reddi: seçilmedi (yukarıda).

## Sonuçları

- Yüklenip kaydedilmeyen görsel (Vazgeç ya da sayfadan çıkış) galeriye bağlanmamış dosya olarak kalır; temizliği kayıtsız görsellerin temizliğiyle aynıdır (kart 0093).
- Yeni yüklenen görsel birleşimin görseli olarak ancak kayıttan sonra seçilir (birleşim kayıtlı galeri öğesine bağlanır).
- Hata ekranın öğesinin yoluyla döner (`galeri.ogeler.<sıra>`); odak o kartın "Düzenle" düğmesine gider. Liste değişince öğe hataları kalkar.
- Çakışma yalnız öğe kümesine bakar (eklenen ya da silinen öğe). Başka bir yöneticinin aynı anda değiştirdiği sıra ya da alternatif metin, ürünün öteki alanları gibi son kaydedenle ezilir.
- Kayıt sürerken yüklenen görsel formda kalır; sayfa yenilenince sunucuda kaydedilmiş yeni öğeler aynı dosyayla eşlenip kimliğini alır (`galeriyiEsle`). Sayfadan çıkılınca süren yükleme iptal edilir, yükleme sürerken çıkışta sorulur.
