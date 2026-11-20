# 0256 · Tarihe bağlı havale bildirimi testi

## Amaç

Ana dalın (44820784529) ve `bolum-13` etiketinin (44821031760) hattı birim testlerinde tek testle kırmızı bitti: `cekirdek/moduller/yonetici-bildirimi/testler/servis.test.ts` içindeki "havale bildirimi ve iade talebi e-postası" testi (kart 0241). Test ödeme gününü sabit `"2026-11-19"` olarak veriyordu. Servis siparişten bir buçuk günden daha eski ödeme gününü reddeder (`cekirdek/moduller/siparis/servis.ts`), hat 2026-11-20T21:31Z'de çalışınca bu gün sınırın dışında kaldı. Test bundan sonra her çalışmada düşecekti, hat bu düzeltmeden önce yeşile dönemezdi.

## Olmazsa olmazlar

- Ödeme günü testin çalıştığı günden alınsın, aynı dosyanın öteki havale bildirimi gibi.
- Hatanın yerelde de çıktığı düzeltmeden önce ölçülsün.
- Testlerde bugünün tarihine bağlı kalıp zamanla kırmızıya dönecek başka sabit tarih aransın.

## Sınırlar

- Servisin tarih kuralı değişmez.
- Öteki testlere dokunulmaz.

## Bitti sayılır

- Düzeltmeden önce test yerelde aynı hatayla (`dogrulama`, `odemeTarihi`) kırmızı.
- Düzeltmeyle test dosyası yerelde yeşil, denetim ve tür kontrolü temiz.
- Başka tarihe bağlı test yok ya da bulunanlar kart olarak yazılı.
- Hat bu değişiklikle yeşil biter.

## Sonuç

- Düzeltmeden önce test yerelde hattakiyle aynı hatayla düştü (`BilinenHata: dogrulama`, `siparis/servis.ts:334`).
- Ödeme günü artık `new Date().toISOString().slice(0, 10)`; dosya 12/12 yeşil, `pnpm denetim` ve `pnpm tur-kontrolu` temiz.
- Testlerdeki öteki sabit tarihler (fiyat ve indirim testleri) işleve "şimdi" olarak verilen sabit anlardır, takvimle değişmez. `"2020-01-01"` reddi bilerek bekleyen örnektir.
- Bağımsız kontrol: servis tarihi sitenin saat diliminde öğlen olarak okur; UTC bugünü günün her saatinde ileri tarih kuralına en az 27, siparişten önce kuralına en az 21 saat payla geçer (UTC gece yarısına 15 dakika kala da yeşil). `odemeTarihi` kullanan öteki testler bugünden hesaplar ya da bilerek reddedilen değerdir.
- Hattın yeşil bitmesi gönderimden sonra görülür.

## Durum

bitti
