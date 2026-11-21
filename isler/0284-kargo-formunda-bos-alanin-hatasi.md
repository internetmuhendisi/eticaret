# 0284 · Kargo formunda boş zorunlu alan genel hata veriyor

## Amaç

Kullanıcı panelde gördü: Kargo ekranında zorunlu alanlar (kargo ücreti, kargoya verme süresi) boş bırakılıp kaydedilince alanların altında hata çıkmıyor, formun başında yalnız "Kargo ayarları kaydedilemedi. Sayfayı yenileyip yeniden deneyin." yazıyor. Yanlış değer (örneğin "abc") yazılınca alanın hatası doğru görünüyor.

Sebep (ölçüldü): uç şeması (`cekirdek/moduller/kargo/semalar.ts`) iki alanda `min(1)` ister. Boş alan servise varmadan kapıda reddedilir, kapı `dogrulama` hatasını şemanın kendi koduyla döndürür (`cekirdek/kapi/uc.ts`; ölçümde `kargoUcreti` ve `kargoyaVermeSuresi` için `too_small`). Kargo ekranı (`cekirdek/yonetim-paneli/kargo/ekran.tsx`) yalnız servisin üç kodunu (`tutar-okunamadi`, `tutar-sinir-disi`, `gun-gecersiz`) alana eşler, `too_small` hiçbir alana düşmez, alan hatası kalmayınca genel metin yazılır. Yanlış değer şemadan geçer, servisin koduyla döner, bu yüzden o durumda doğru çalışıyor. Kart 0212'nin tarayıcı testi yalnız okunamayan tutarı denediği için yakalamadı.

Panelde şemanın kendi kodlarını alana eşleyen ortak yol vardır (`cekirdek/yonetim-paneli/kodlu-form.ts`: `too_small` ve `invalid_type` "zorunlu" metnine). Kargo ekranı o yolu kullanmıyor, kendi eşlemesini yazıyor.

## Olmazsa olmazlar

- Boş zorunlu alan kendi altında "zorunlu" hatasını alır, iki alan boşsa ortak form yapısının kuralıyla odak özete gider (karar 0159), genel metin yazılmaz.
- Şemanın kodunu alana eşlemek tek yerde yapılır: kargo ekranı mümkünse ortak yolu kullanır, ayrı bir kopya yazılmaz.
- Aynı hatanın başka yerde olup olmadığı aranır: kendi kod eşlemesini yazan öteki panel formları (banka hesabı penceresi, iptal ve iade ayarları, yönetici bildirimleri ayarları, sipariş ayarlarında firma, kargoya verme penceresi, iade penceresi, sipariş notu) boş zorunlu alanla denenir. Bulunan her biri aynı işte düzeltilir ya da ayrı kart olarak yazılır.
- Tarayıcı testinde: Kargo ekranında iki zorunlu alan boşaltılıp kaydedilince iki alanın hatası ve özet görünür, tek alan boşken odak alana gider.

## Sınırlar

- Uç şeması ve servisin kuralları değişmez (boş alan yine reddedilir).
- Kapının hata zarfı değişmez.

## Bitti sayılır

- Boş alan hatası Kargo ekranında alanın altında görünüyor, tarayıcıda ölçüldü; düzeltme geri alınınca test kırmızı.
- Öteki formların taraması yapıldı, sonucu karta yazıldı.
- Bağımsız kontrol yapıldı.

## Durum

yapılacak
