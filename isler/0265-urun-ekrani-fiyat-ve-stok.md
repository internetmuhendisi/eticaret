# 0265 · Ürün ekranı: fiyat, fiyat geçmişi ve stok

## Amaç

Mağaza sahibi her birimin fiyatını, indirimini ve stoğunu panelden girebilmeli, fiyat ve stok geçmişini görebilmeli. Servisler var (kartlar 0080–0083), ekranı yok.

Bölüm: Yönetim paneli. Önce 0263 bitmiş olmalı; varyantlı ürün için 0264.

## Olmazsa olmazlar

- Satış fiyatı, indirimli fiyat, indirimin başlangıcı ve bitişi (sitenin saat dilimiyle); vergi dahil ya da hariç girişin ekranda söylenmesi; tutar sitenin biçimiyle okunur (kart 0136'nın kuralı).
- Fiyat geçmişi (sayfalı) ve "30 gün öncesinin en düşüğü" kuralının sonucu (kart 0081).
- Stok takibi, elle düzeltme (sebep ve not), görülen miktar değiştiyse çakışma, stok geçmişi, ürünün düşük stok eşiği.
- Görevli fiyatı görür, değiştiremez (izin kaydı); uç belgesi ve rol erişim testi.

## Sınırlar

- Kupon ve kampanya on beşinci bölümdedir.

## Bitti sayılır

- Gerçek istekle fiyat, indirim ve stok değişikliği ve vitrinde sonucu; çakışma; tarayıcıda klavyeyle, iki renkte ve üç genişlikte tarama.
- Ekran görüntüsü taslakla yan yana kondu, farklar düzeltildi.
- Bağımsız kontrol yapıldı.

## Notlar

- Kullanıcı kararı: birleşim tablosundaki stok değişikliklerinin sebebi tablonun altında tek seçimle (varsayılan "Sayım düzeltmesi", "Diğer"de not zorunlu), Kaydet'le gider. Karar 0164.
- Fiyat geçmişine yazan eklendi (veritabanı değişikliği 0051); eski satırlarda "Bilinmiyor".
- Testlerin bulduğu: "Stoğu düzelt" penceresi kapanınca odak gövdeye düşüyordu; telefonda kayan geçmiş tabloları klavyeyle kaydırılamıyordu; sayfanın formunun içindeki pencerenin gönderimi dıştaki formu da gönderiyordu (ortak `PanelFormu` düzeltildi).
- Bağımsız kontrolün bulguları düzeltildi: sayfa yenilenince dokunulmamış stoğun geri yazılması (form üç yönlü birleşir), satırın sıra değişince başka birime yazılması (birim kimliği), stokların kilit sırası, birleşimin kendi indirim zamanının ezilmesi, yalnız indirimli satırın atılması, yeni varyantlı ürünün ilk stoklarının sebebi.
- Taslakla karşılaştırma: kayıtlı satış fiyatı zorunlu gösterildi; bilinçli farklar karar 0164'te. Açılışta odağın kaydet çubuğuna geçmesi ayrı iştir (kart 0283).

## Durum

bitti
