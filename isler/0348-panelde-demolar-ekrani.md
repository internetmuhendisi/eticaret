# 0348 · Panelde Demolar ekranı

## Amaç

Mağaza sahibi panelden sektör demolarını görür, birini örnek verilerle ya da onlarsız içe aktarır, sonucu ve ilerlemeyi görür, başka demoya ya da önceki hâline geçer. Ekran kart 0346'nın onaylı taslağına göre yazılır; servis kart 0347'dedir.

Bölüm: Yeni mağaza. Önce 0346 ve 0347 bitmiş olmalı.

## Olmazsa olmazlar

- Panelin ortak liste, form ve pencere yapısıyla (kart 0258, 0259); menüde kararın seçtiği grupta, izne bağlı (`sayfa-agaci.test.ts`, `panel-yetkisi.test.tsx`).
- Demolar listesi, içe aktarma penceresi (aktarılacak ve korunacak parçalar, "örnek verileri de aktar"), ilerleme, sonuç ve hata hâlleri, önceki hâline dönüş onayı, "Demoyu gez".
- Klavyeyle baştan sona; pencerede odak, kapanınca odağın açan düğmeye dönmesi; ilerleme ve sonuç ekran okuyucuya duyurulur.
- Tarayıcıda: ekran, pencere, ilerleme ve sonuç iki renkte ve üç genişlikte taramadan geçer, yana kaymaz, konsolda hata yok; içe aktarmadan sonra vitrinde "(örnek)" ekli ürün ve demonun düzeni görünür, mağazanın adı ve logosu değişmez; dönüşten sonra eski hâl.
- Kendi ekran görüntüsü taslakla yan yana konur, farklar düzeltilir ya da bilerek kalanlar karar kaydına yazılır (bölümün kuralı).
- Yardım içeriği varsa aynı değişiklikte güncellenir.

## Sınırlar

- Servisin davranışı değişmez (değişmesi gerekirse kart 0347'ye not düşülür).
- Tarayıcı testleri paylaşılan veritabanında başka testlerin düzenini bozmayacak biçimde düzen kilidini alır (kart 0293).

## Bitti sayılır

- Ekran taslakla karşılaştırıldı, farklar kartta.
- Tarayıcı testleri ve jsdom testleri yeşil, her denetim bilerek bozularak kırmızı.
- Menü ve izin testleri güncel.

## Durum

yapılacak
