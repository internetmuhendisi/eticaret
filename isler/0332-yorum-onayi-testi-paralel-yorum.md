# 0332 · Yorum onayı testi paralel yazılan yorumla düşüyor

## Amaç

Hat 45960348252'de (803edb75) `yorum-onayi.test.ts:178` menüdeki onay bekleyen yorum sayısını "1" beklerken "2" gördü. Test beklenen yazıyı veritabanından bir kez okur (`sayiYazisi`), menü sayfanın çizildiği andaki sayıyı gösterir; hatta iki işçi paralel çalışır, vitrinin yorum testi (`yorumlar.test.ts`) aynı veritabanına onay bekleyen yorum yazar. Sebep ölçülmedi, bu bir tahmindir.

## Olmazsa olmazlar

- Düşüşün sebebi hattın izinden ve sunucu günlüğünden ölçülür (aynı anda yazılan yorum var mı).
- Test başka testin yazdığı yorumdan etkilenmez (kilit, kendi ürünü ya da sayının ölçüldüğü an), sırası kurularak kırmızı gösterilir.

## Sınırlar

- Menü sayısının kuralı (kart 0277) değişmez.

## Bitti sayılır

- Sebep ölçümle yazıldı; düzeltmesiz test sıra kurularak kırmızı, düzeltmeyle yeşil.

## Durum

yapılacak
