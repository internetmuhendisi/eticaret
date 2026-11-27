# 0333 · Dışa aktarma kutusu taranırken sayfa başlığı boş

## Amaç

Hat 45960348252'de (803edb75) `siparisler.test.ts:1084` (kart 0316) "dosya hazırlanıyor kutusu" koyu temada 375 px'te taranırken `document-title` ihlali verdi. Kutu hazırlanırken sayfayı yeniler (`router.refresh()`); tarama başlığın dolmasını bekler (kart 0287, 0288) ama başlık tarama sürerken yeniden boşalabilir. Sebep ölçülmedi.

## Olmazsa olmazlar

- Başlığın yenileme sırasında boşaldığı izden ölçülür.
- Tarama yenilenmekte olan sayfada ihlal üretmez (kutunun yenilemesi taramada durur ya da başlık boşalmaz), sırası kurularak kırmızı gösterilir.

## Sınırlar

- Kutunun sorma davranışı (karar 0194) değişmez.

## Bitti sayılır

- Sebep ölçümle yazıldı; düzeltmesiz test sıra kurularak kırmızı, düzeltmeyle yeşil.

## Durum

yapılacak
