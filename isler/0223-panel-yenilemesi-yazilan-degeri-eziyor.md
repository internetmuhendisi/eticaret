# 0223 · Panelde kaydettikten hemen sonra yazılan değer yenilemeyle kayboluyor

## Amaç

Kart 0215'in tarayıcı testlerinde (2026-11-17) panelin "Ödeme yöntemleri" testi (`cekirdek/testler/uctan-uca/odeme-yontemleri.test.ts`, "iptal süresinin kaydı") yedi denemenin ikisinde son adımda düştü: iptal süresi kaydedilip eski değerine döndürülürken değer dönmedi ("3 beklendi, 4 kaldı").

Sebep, kod okumasıyla (ölçülmedi): `usePanelIslemi` başarıda `router.refresh()`'i beklemeden çağırır ve hemen döner (`cekirdek/yonetim-paneli/panel-islemi.ts`). Ekran sunucunun verisi değişince formu baştan kurar (`ekran.tsx`, `useEffect(() => setForm(veri.form), [ilkAnahtar])`). Kullanıcı kaydettikten hemen sonra alana yeni değer yazarsa ve yenileme o arada gelirse, yazdığı değerin üstüne kayıtlı değer yazılır; Enter eski değeri kaydeder. Gerçek kullanıcı da hızlı yazarsa yazdığını kaybedebilir. Aynı kalıp başka panel ekranlarında da olabilir.

## Olmazsa olmazlar

- Önce sebep ölçülür: yenilemenin yazılan değeri ezdiği tarayıcıda gösterilir (ör. yenileme yapay olarak geciktirilerek).
- Düzeltme ortak yerde yapılır (panel işlemi ya da formun baştan kurulma kuralı): kullanıcının kaydedilmemiş değişikliği sunucunun yenilemesiyle ezilmez.
- Aynı kalıbı kullanan öteki panel ekranları aranır.

## Sınırlar

- Ödeme yöntemlerinin kuralları değişmez.

## Bitti sayılır

- Sebep ölçümle yazıldı.
- Yenileme geciktirilerek kurulan tarayıcı testi düzeltmeyle yeşil, düzeltme geri alınınca kırmızı.
- "Ödeme yöntemleri" testi art arda on çalışmada yeşil.
- Kontrol hattı yeşil.

## Ölçüm ve düzeltme (2026-11-18)

**Sebep ölçüldü.** Tarayıcı testinde kayıttan sonraki yenileme isteği (`RSC: 1` başlıklı GET) test izin verene kadar tutuldu. Senaryo: iptal süresi "4" yapılıp kaydedilir, bildirim görünür, alan "3" yapılır, yenileme serbest bırakılır.

- Eski kodda yenileme gelince alan "4" oldu ve Enter "4"ü kaydetti. Beş çalışmanın beşi kırmızı, hepsinde "Received: 4". Bu, hattaki düşüşün aynısı.
- Kanıt yalnız ekrandan değil, kodun yolundan da geliyor: `usePanelIslemi` yenilemeyi beklemeden döner. Ekran `useEffect(() => setForm(veri.form), [JSON.stringify(veri.form)])` ile formu sunucunun verisi değişince baştan kuruyordu.
- İlk deneme yenilemeyi yalnız 1,5 sn geciktiriyordu; üç çalışmanın biri yeşil kaldı. Yenilemeyi tutan sürüm her çalışmada kırmızı oldu.

**Düzeltme ortak yerde.** Yeni kanca `useSunucuFormu` (`cekirdek/yonetim-paneli/sunucu-formu.ts`).

- Ekran, sunucuda olduğunu bildiği hâli tutar: başarıda `kaydedildi(gonderilen)`. Kaydın yankısı olan yenileme formu ezmez.
- Farklı veri, yalnız kaydedilmemiş değişiklik yoksa forma geçer. Farklı veri: sunucunun düzelttiği yazılış ya da başka yerde yapılan değişiklik.
- Sunucunun yeni verisi değerle değil, gelen nesnenin kendisiyle tanınır. Bu, bağımsız kontrolün bulgusuyla eklendi: kayıttan önceki değeri geri getiren yenileme, örneğin "59,9" kaydedilip sunucunun "59,90" yazması, artık forma geçer.
- "Değişti" ve "Vazgeç" bilinen hâle göredir.

**Kancaya geçen ekranlar.** Aynı kalıbı kullanan üç ekran var:
- Ödeme yöntemleri.
- Kargo. Sunucu tutarı "60,00" diye düzeltir.
- Tema: filtre yeri. Kaydet düğmesi artık kancanın "değişti"siyle açılır.

**Sonuçlar.**
- Yeni tarayıcı testi düzeltmeyle yeşil.
- "Ödeme yöntemleri" dosyası, kancanın son hâliyle, on kez art arda 3/3 yeşil.
- Sepet (kargo ekranı) ve tema testleri yeşil.
- Kancanın birim testi 7/7. Dört kuralı ayrı ayrı bozuldu, her biri kırmızıya düştü.

**Bağımsız kontrol.**
- İki bulgu bu kartta düzeltildi:
  - Kayıttan önceki değeri geri getiren yenileme artık forma geçiyor.
  - Tema ekranının Kaydet düğmesi kancanın "değişti"sini kullanıyor.
- İki bulgu ayrı karta yazıldı:
  - Kart 0227: yeni Slider'da form React anahtarıyla baştan kuruluyor.
  - Kart 0228: hemen kaydedilen sıralanabilir listelerde arka arkaya sıralamada yenileme eski sırayı gösterebiliyor.

**Kalan madde.** "Kontrol hattı yeşil" maddesi gönderimde görülecek.

## Durum

bitti
