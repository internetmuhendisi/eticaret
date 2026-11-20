# 0227 · Yeni Slider'da kayıttan hemen sonra yazılan değer kayboluyor

## Amaç

Kart 0223'ün bağımsız kontrolü kod okumasıyla buldu (ölçülmedi): panelin Slider sayfasında henüz Slider yokken form `key="yeni"` ile çizilir (`cekirdek/yonetim-paneli/vitrin-bolumleri/slider.tsx:80`, `BolumDuzenleyici key={slider?.kimlik ?? "yeni"}`). Kaydedince yenileme yeni bölümün kimliğini getirir, anahtar değişir ve form baştan kurulur. Kayıt ile yenileme arasında bir slayt alanına yazılan değer silinir; "kaydedilmemiş değişiklik" uyarısı da çıkmaz. Kart 0223'ün düzelttiği sorunla aynı türden, ama sıfırlama `useSunucuFormu`'nun karşılamadığı bir yoldan (React anahtarı) geliyor.

Var olan Slider düzenlenirken anahtar değişmez; o durumda sunucunun düzelttiği değer forma hiç geçmez (düşük önem).

Bölüm: Yönetim paneli.

## Olmazsa olmazlar

- Önce tarayıcıda ölçülür: kart 0223'ün testindeki gibi yenileme isteği tutulur, yeni Slider kaydedilir, tutulan sırada alana yazılır, sonra yenileme bırakılır.
- Düzeltme ortak kalıpla yapılır (`useSunucuFormu` ya da anahtarın kayıttan sonra değişmemesi). Bölüm düzenleyicisinin öteki kullanımları (vitrin bölümleri penceresi) da aynı gözle denetlenir.

## Sınırlar

- Slider'ın alanları, kuralları ve ekranın görünüşü değişmez.

## Bitti sayılır

- Sebep ölçümle yazıldı.
- Yenileme tutularak kurulan tarayıcı testi düzeltmeyle yeşil, düzeltme geri alınınca kırmızı.
- Kontrol hattı yeşil.

## Durum

yapılacak
