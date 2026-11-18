# 0144 · Ödeme yöntemlerinin sırası hemen kaydedilir

## Tarih

2026-11-18

## Karar

Panelin "Ödeme yöntemleri" ekranında yöntemlerin sırası, satır taşınır taşınmaz kaydedilir ve "Yöntemlerin sırası kaydedildi" bildirimi çıkar (kullanıcı kararı, kart 0224). Sıra kendi ucuyla gider (`/kapi/yonetici/odeme-yontemleri-sirala`) ve yalnız sırayı yazar. Anahtarlar (açık-kapalı), kapıda ödemenin seçenekleri ve havalenin iptal süresi yine birlikte "Kaydet" ile kaydedilir. Ekranda kaydedilmemiş bir değişiklik varken yapılan sıralama o değişikliği kaydetmez. Bu karar 0141'in "Ödeme yöntemleri tek formdur" maddesinin yalnız sıra kısmını değiştirir.

## Neden

- Kullanıcının gözlemi: sıra ekranda değişiyor ama kaydedilmiyor, vitrinin ödeme adımında eski sıra kalıyordu.
- Ölçüm (kart 0224): "Kaydet"e basılınca sıra kaydediliyor ve vitrinde görünüyordu. "Kaydet"e basmadan sayfadan çıkınca kaydedilmiyordu; ekranda bunu söyleyen tek işaret açık "Kaydet" düğmesiydi.
- Aynı ekrandaki banka hesaplarının sırası ve kütüphanenin sıralanabilir listesinin kuralı ("kullanan yeni sırayı hemen verir, kaydı arkadan yapar") zaten hemen kaydediyordu.
- Sıranın ayrı uçla gitmesinin teknik nedeni: bütün formu gönderen uç, sıralamayla birlikte ekrandaki kaydedilmemiş anahtar ve süre değişikliğini de istemeden kaydederdi.

## Düşünülen diğer yollar

- **Sıra "Kaydet"le kalsın, kaydedilmemiş değişiklik belirgin söylensin.** Ekranın her şeyi tek düğmeyle kaydetme kuralı korunurdu. Ama aynı ekrandaki banka hesaplarının sırasıyla tutarsız kalırdı ve kullanıcının gözlemindeki kaybı yalnız uyarıyla azaltırdı. Kullanıcı seçmedi.
- **Sıralama bütün formu gönderen uçla hemen kaydedilsin.** Yeni uç gerekmezdi. Ama sıralamayla birlikte kaydedilmemiş anahtar değişikliği de istemeden yayınlanırdı.

## Sonuçları

- Tek ekranda iki kaydetme biçimi vardır: sıra hemen, öteki ayarlar "Kaydet"le. Ekranın açıklaması bunu söyler.
- Yeni uç `odeme-yontemi.degistir` izniyle yazılır, uç belgesinde ve rol erişim testindedir.
- Arka arkaya hızlı sıralamada yenilemenin kısa süre eski sırayı göstermesi, öteki hemen kaydedilen listelerle aynı kalıptır; kart 0228'dedir.
