---
paths:
  - "cekirdek/vitrin/**"
  - "cekirdek/uygulama/**"
  - "cekirdek/temalar/**"
  - "siteler/*/vitrin/**"
  - "siteler/*/marka/**"
  - "**/*onbellek*"
  - "**/next.config.*"
---

# Performans

Önbellek, sık istenen verinin hızlı verilmek için geçici olarak saklandığı yerdir.

- Hız hedeflerine uy: gerçek ziyaretçilerin büyük çoğunluğu için sayfanın ana içeriği 2,5 saniye içinde görünsün, tıklamaya tepki 200 milisaniyeyi geçmesin, yükleme sırasında kayma çok düşük kalsın (0,1).
- Vitrin sayfalarında indirilen kodun üst sınırını aşma (sıkıştırılmış 320 KB).
- Hedefler tek yerdedir (`cekirdek/testler/hiz/hedefler.ts`). Hız ölçümü (`pnpm hiz-olcumu`, karar 0124) her vitrin sayfa türünü canlıdaki gibi derlenmiş çekirdekte, yavaş telefon koşuluyla ölçer; aşan sayfa kontrol hattını durdurur. Yeni bir vitrin sayfa türü `cekirdek/testler/uctan-uca/vitrin-sayfalari.ts`'e eklenir: ekran ve hız ölçümü onu da ölçer.
- Tarayıcıda çalışan kod (`"use client"`) zod'u, şemaları ve sunucu modüllerini yalnız gerçekten gerekiyorsa içe aktarır (form doğrulaması). Kimlik biçimi `kimlik-bicimi.ts`, varsayılan dil `metin.ts`'ten alınır (kart 0146: her sayfayla 30 KB zod gidiyordu).
- İlk ekranda görünen görsel öncelikli yüklenir (`oncelikli`: tembel değil, `fetchPriority="high"`); listede ilk `oncelikliKartSayisi` kart.
- Görselleri cihaza uygun boyutta, modern biçimde ve ekrana girdikçe yükle.
- Hangi verinin ne kadar süre önbellekte tutulacağını ve ne zaman silineceğini tanımla.
- Fiyat, stok ya da içerik değişince ilgili önbelleği hemen sil.
- Sepet ve ödeme akışını beklenen en yoğun trafiğin katlarıyla düzenli yük testinden geçir.
