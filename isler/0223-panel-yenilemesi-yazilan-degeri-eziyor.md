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

## Durum

yapılacak
