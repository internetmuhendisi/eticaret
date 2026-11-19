# 0248 · Havale bildirimi sayfasının kodu sınırı aşıyor

## Amaç

Kart 0236'nın gönderimiyle kontrol hattı (44528927734) yalnız hız ölçümünde kırmızı bitti: havale bildirimi sayfasının sıkıştırılmış JavaScript'i 333 KB, sınır 320 KB. Son yeşil hatta (44312616772, 0216) aynı sayfa 314 KB'tı; öteki sayfalar bu arada yalnız 4–5 KB büyüdü. Tür kontrolü, denetim, birim testleri ve 290 tarayıcı testi yeşildi.

Ölçülmemiş iz: havale bildirimi formu (`cekirdek/vitrin/siparis/havale-bildirimi-formu.tsx`) tarayıcıda `cekirdek/moduller/siparis/semalar.ts`'ten iki şema alıyor. Bu dosya kart 0234–0236 boyunca panel şemalarıyla büyüdü ve kart 0236 ile `../odeme/semalar.ts`'i (adres şeması, `bolgeler/adres.ts`, `bolgeler/satici.ts`), `../sepet/semalar.ts`'i ve `../degisiklik-kaydi/deger.ts`'i içe aktarmaya başladı. Büyümenin bundan geldiği derlenmiş paketin içeriğine bakılarak doğrulanmalı.

## Olmazsa olmazlar

- Büyümenin kaynağı derlenmiş paketin içeriğiyle ölçülür (hangi modül kaç KB).
- Tarayıcıya giden şemalar panelin ve sunucunun şemalarından ayrılır; havale bildirimi formu yalnız kendi şemasını taşır.
- `pnpm hiz-olcumu` hattın koşulunda (temiz deneme veritabanı) yeşil.
- Aynı içe aktarmanın öteki vitrin formlarında (ödeme, sepet) olup olmadığına bakılır.

## Sınırlar

- Kod sınırı (320 KB) yükseltilmez, bilinen aşım listesine eklenmez.
- Genel kod küçültmesi kart 0194'ün işidir.

## Bitti sayılır

- Havale bildirimi sayfasının kodu 320 KB'ın altında, ölçüm sonucu kartta yazılı.
- Öteki sayfaların kodu büyümedi.
- Kontrol hattı yeşil.

## Ölçüm

- Derlenmiş paket (`next build`, sayfanın istemci parçaları, gzip): havale bildirimi 197,2 KB, favoriler 173,1 KB. Fazla parçalardan 13,5 KB'lık olanda adres, il ve ilçe listesi, vergi numarası, MERSİS ve KEP kuralları vardı (ödeme şemasından), 4,3 KB'lık olanda sipariş kayıtları ve form.
- Düzeltme: havale bildirimi ve sipariş numarası şemaları `cekirdek/moduller/siparis/havale-bildirimi-semalari.ts`'e taşındı; vitrinin formu, iki uç ve testler oradan alır, panelin şemaları `semalar.ts`'te kaldı. Sonra havale bildirimi 182,5 KB (−14,7 KB), adres parçası yok.
- Hız ölçümü hattın koşulunda (temiz veritabanı, iki işlemci): havale bildirimi 333 KB'tan 318 KB'a indi, ana içerik 2012 ms. Öteki sayfaların kodu hattakiyle aynı. Aynı çalışmada ürün sayfasının ana içeriği 2516 ms ile sınırı aştı; kodu değişmedi, yeniden ölçümde 2516, 2480, 2480 ms (kart 0249).
- Öteki vitrin formlarının şema dosyaları (favori, müşteri, ödeme, oturum, sepet, yorum) yalnız kendi ihtiyacını içe aktarıyor; ödeme formu adres şemasını gerçekten kullanır.
- Payı yalnız 2 KB'tır: vitrinde yeni ortak kod sınırı yine aşabilir (genel küçültme kart 0194).

## Durum

bitti
