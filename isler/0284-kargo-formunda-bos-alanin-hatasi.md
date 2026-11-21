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

## Notlar

- Kargo ekranı ve ödeme yöntemleri ekranı şemanın kodunu ortak eşlemeden alır (`kodluAlanHatalari`); servisin kendi kodu önce gelir.
- Tarama: kartta sayılan yedi formun hiçbirinde hata yok. Banka hesabı, kargo firması, kargoya verme penceresi, iade penceresi ve sipariş notu boş alanı göndermeden önce ekranda yakalıyor. İptal ve iade ayarları hatayı alanın yolundan alana bağlıyor, kodundan değil. Yönetici bildirimleri ayarlarının alanı isteğe bağlı. Bunlar kod okunarak bulundu, tarayıcıda ayrıca ölçülmedi.
- Taramada bulunan: ödeme yöntemleri ekranındaki havale iptal süresi aynı hatayı taşıyordu. Uç şeması `min(1)` ister, ekran yalnız servisin kodlarını tanıyordu. Boş süre genel hatayı veriyordu: tarayıcı testinin yeni adımı eski kodda kırmızıydı. Aynı işte düzeltildi.
- Bozma: kargo ekranının eski eşlemesi geri konunca kargo testi boş alan adımında kırmızıya düştü.
- Bağımsız kontrolün bulgusu: kapıda ödemenin bütün seçenekleri kaldırılınca da genel metin çıkıyordu. Şemanın `min(1, "secenek-gerekli")` iletisi kapıdan gelmiyor, yalnız `too_small` geliyor. Tarayıcı testinin yeni adımı eski kodda kırmızıydı; düzeltmeyle seçeneklerin altında kendi metni görünüyor, dosyanın beş testi yeşil. Uç belgesi dönen gerçek kodlarla düzeltildi. Kargo testindeki arama alanın kabına daraltıldı.
- Kapsam dışı bırakılanlar kart 0285'te: kapının şemanın kendi kodunu taşımaması, üç kopya eşleme işlevi, uzunluk sınırı olmayan iki pencere.

## Durum

yapılacak
