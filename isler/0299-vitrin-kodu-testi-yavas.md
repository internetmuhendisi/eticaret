# 0299 · Vitrin kodu testinin zincir taraması süre sınırını aşıyor

## Amaç

Kart 0295'in koruyucu testi (`cekirdek/testler/vitrin-kodu.test.ts`, "panel ve katalog dışındaki çekirdek dosyaları panelin ikon sözlüğüne varmaz") her başlangıç dosyası için içe aktarma çizgesini baştan geziyor (yaklaşık 1000 dosya, her biri için ayrı tarama). 2026-11-24'te yük ortalaması 26 iken ana dalda (7df83ee) 6059 ms sürdü ve Vitest'in 5 saniyelik sınırını aştı; testin kendisi kırmızı, sızıntı yok. Kart 0295'te yüksüz makinede yaklaşık 1,7 saniyeydi. Hat 7df83ee'nin sonucu bu yüzden kırmızı olabilir.

Bölüm: Yönetim paneli (kart 0271 sırasında bulundu).

## Olmazsa olmazlar

- Tarama bütün başlangıç dosyalarından tek geçişte yapılır (çok başlangıçlı tarama) ya da dosyanın içe aktarmaları bir kez okunur; testin denetlediği kural ve bozuk örnekleri değişmez.
- Ölçülür: düzeltmeden önce ve sonra yük altında testin süresi.

## Sınırlar

- Kart 0253'ün metin testi aynı yardımcıyı kullanır; davranışı değişmez.

## Bitti sayılır

- Test yük altında süre sınırının çok altında; düzeltmeden önceki ve sonraki süre karta yazıldı.
- Bozuk örnekler yine yakalanıyor (düzeltme geri alınınca kırmızı değil, ölçüm yeşil; kural bozulunca kırmızı).

## Durum

yapılacak
