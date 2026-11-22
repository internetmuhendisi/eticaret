# 0293 · Hat 45045593092'nin üç tarayıcı kırmızısı

## Amaç

Hat 45045593092'de (2026-11-22, kart 0291'in gönderimi) birim testleri yeşil, tarayıcı testlerinde 334 test geçti, 4 test düştü, tema aşamasının 4 testi çalışmadı. Biri kart 0292'dedir. Öteki üçü bu kartlardan önceki kodda da duran testlerdir; sebepleri ölçülmedi:

- `iade-talebi.test.ts:356`: "iptal edilmiş sipariş (takip) light 375" taramasında `document-title` (sayfanın başlığı boş). Panelde benzer belirti kart 0287'dedir; bu vitrinin takip sayfasıdır.
- `odeme.test.ts:354`: havale bildiriminden sonra "Bildiriminiz alındı" durumu 5 saniyede görünmedi (odak denetimi).
- `vitrin-bolumleri.test.ts:315`: "Taşı: Duyuru şeridi, 5. sıradaki" düğmesi 15 saniyede bulunamadı (paylaşılan düzende bölümün sıra numarası değişmiş olabilir, kart 0197'nin kalıbı).

## Olmazsa olmazlar

- Her biri hattın izinden (`tarayici-testleri-izi`, 14 gün saklanır) okunur; sebep bir ölçümle doğrulanır.
- Ürün hatasıysa düzeltilir, testin zamanlamasıysa test sırayı kuracak biçimde güçlendirilir.

## Sınırlar

- Kart 0292'nin galeri taraması bu karta girmez.

## Bitti sayılır

- Üç testin sebebi ölçümle yazıldı, düzeltildi; her düzeltme geri alınınca kırmızı (zamanlamaya bağlıysa sırası kurularak).
- Tam tarayıcı takımı yerelde hattın koşulunda bir kez yeşil.
- Bağımsız kontrol yapıldı.

## Durum

yapılacak
