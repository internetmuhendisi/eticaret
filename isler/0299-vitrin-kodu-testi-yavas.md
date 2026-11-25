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

## Notlar

- Sebep: her başlangıç dosyası (vitrin tarafında 1000 kadar) için zincir taraması aynı dosyaları diskten yeniden okuyup içe aktarmalarını yeniden çözüyordu. Düzeltme: dosyanın çözülmüş içe aktarmaları okuyucu başına bir kez okunur (`hedefler`, `ice-aktarma-zinciri.ts`); tarama sırası ve kural aynı.
- Ölçüm (32 işlemcili makine, işlemci başına iki meşgul süreçle yapay yük): düzeltmeden önce makinenin kendi yükünde (ortalama 15) 3,4 ve 3,9 sn, yük ortalaması 70'te 10,6 ve 12,2 sn (ikisi de 5 sn sınırında kırmızı); düzeltmeden sonra yük 54'te 0,27 ve 0,30 sn, yük 74'te 0,93 ve 0,94 sn.
- Eski ve yeni tarama 1046 başlangıç dosyasında üç hedefe (ortak ikon sözlüğü, metin.ts, degerler.ts; 291, 611 ve 711 zincir) birebir aynı zinciri buldu (geçici karşılaştırma testiyle).
- Gerçek vitrin dosyasına panelin ikonu konunca test zinciriyle kırmızı; önbellek okuyucudan bağımsız tek önbelleğe çevrilince iki dosyanın bozuk örnekleri kırmızı.

## Durum

yapılacak
