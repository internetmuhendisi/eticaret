# 0264 · Ürün ekranı: varyantlar

## Amaç

Seçenekli ürünün (beden, renk) seçenekleri ve birleşimleri panelden kurulabilmeli. Servisi var (kart 0085), ekranı yok.

Bölüm: Yönetim paneli. Önce 0263 bitmiş olmalı.

## Olmazsa olmazlar

- Seçenek ve değer ekleme, sıralama, silme; ilk seçenekte basit birimin, son seçenek silinince yeniden basit ürünün kuralı ekranda söylenir.
- Birleşimlerin üretilmesi (taslakta kararlaştırılan yolla: hepsi birden ya da tek tek), her birleşimin stok kodu, barkodu, ağırlığı ve görseli.
- Silinen değerin birleşimlerinin silineceği önceden söylenir.
- Değişiklik kaydı ve izinler var olan servisten.

## Sınırlar

- Birleşimlerin fiyatı ve stoğu 0265'tedir (taslak tek tabloda gösterirse iki kart aynı tabloya yazar).

## Bitti sayılır

- Gerçek istekle seçenekli ürün kurulup vitrinde seçilebiliyor; tarayıcıda klavyeyle, iki renkte ve üç genişlikte tarama.
- Ekran görüntüsü taslakla yan yana kondu, farklar düzeltildi.
- Bağımsız kontrol yapıldı.

## Notlar

- Kullanıcı kararı (karar 0163): ürüne yeni seçenek eklenince var olan birimler yeni seçeneğin ilk değerini alır; stok kodu, fiyat, stok ve geçmiş kalır. Karar 0071'in iki kuralı kalktı, başlangıç kataloğu ve eski testler buna uyarlandı (`donusenBirimiSil`).
- Panel son hâli tek işlemde gönderir (`varyantlariKaydet`), birleşimler kendiliğinden kurulur. Kayıtlı seçenek ya da değer silmek `urun.sil` ister.
- Taslaktan bilinçli farklar: değerler çip yerine sıralanabilir satır (sıralama silmeden olsun diye), seçenekler ayrı kartlar (telefonda değer alanı daralmasın diye), birleşim tablosu kendi kabında kayar.
- Bağımsız kontrolün iki hatası düzeltildi: seçenekliden basite dönerken yazılan birim alanları kayboluyordu; eski ekran başkasının eklediği değeri birleşimleriyle siliyordu.
- Kod okunurken bulunan ilgisiz hata kart 0286'ya yazıldı (hata metnindeki "{sinir}").

## Durum

yapılacak
