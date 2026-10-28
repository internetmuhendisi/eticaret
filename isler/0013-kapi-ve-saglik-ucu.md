# 0013 · Kapı: ortak yanıt zarfı ve sağlık ucu

## Amaç

Vitrin ve panelin çekirdekle konuştuğu kapının ortak yapısı kurulur: aynı yanıt zarfı, şemayla doğrulama, her uçta izin beyanı. İlk uç sağlık ucudur, yayın komutu bundan sonra siteyi bununla yoklar (`.claude/rules/sunucu-arayuzu.md`).

Önce 0011 bitmiş olmalı.

## Olmazsa olmazlar

- Dört giriş öneki: `/kapi/herkese-acik/`, `/kapi/musteri/`, `/kapi/yonetici/`, `/kapi/sahip/`.
- Tek yanıt zarfı: başarılıda veri, hatalıda sabit hata kodu ve ayrıntı. Hata kodları kayıt dosyasında.
- Her uç bir Zod şemasıyla ve bir izin beyanıyla tanımlanır. Şeması ya da izni olmayan uç tür kontrolünden geçmez.
- Uç yalnız yönlendirir, işi servis yapar.
- İstek sınırı için ortak yer.
- `/kapi/herkese-acik/saglik`: uygulamanın ve veritabanının ayakta olduğunu ve çalışan çekirdek sürümünü döndürür, kişisel veri döndürmez.
- Uç belgesi açılır, sağlık ucu ona yazılır.

## Sınırlar

- Giriş, oturum ve rol kontrolü bu işe girmez. İzin beyanı yazılır ama kontrolü 0026'da yapılır.
- Sahip panelinin durum ucu bu işe girmez.

## Bitti sayılır

- Sağlık ucu yerelde zarfla cevap veriyor, veritabanı kapatılınca hata koduyla cevap veriyor.
- Şemasız ya da izinsiz yazılan bir örnek uç tür kontrolünü kırmızıya düşürüyor.
- Uç belgesinde sağlık ucu yazıyor.

## Durum

yapılacak
