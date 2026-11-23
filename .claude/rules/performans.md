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
- Vitrin sayfalarında indirilen kodun üst sınırını aşma (sıkıştırılmış 305 KB; karar 0152).
- Hedefler tek yerdedir (`cekirdek/testler/hiz/hedefler.ts`). Hız ölçümü (`pnpm hiz-olcumu`, karar 0124) her vitrin sayfa türünü canlıdaki gibi derlenmiş çekirdekte, yavaş telefon koşuluyla ölçer; aşan sayfa kontrol hattını durdurur. Yeni bir vitrin sayfa türü `cekirdek/testler/uctan-uca/vitrin-sayfalari.ts`'e eklenir: ekran ve hız ölçümü onu da ölçer. Bugün hedefi aşan sayfalar `bilinenAsimlar` listesindedir (hedefler.ts): liste yalnız küçülür, yeni aşım eklenmez.
- Tarayıcıda çalışan kod (`"use client"`) zod'u, şemaları ve sunucu modüllerini yalnız gerçekten gerekiyorsa içe aktarır (form doğrulaması). Kimlik biçimi `kimlik-bicimi.ts`, varsayılan dil `dil.ts`'ten alınır (kart 0253: `metin.ts` bütün metin dosyasını taşır) (kart 0146: her sayfayla sıkıştırılmış yaklaşık 30 KB'lık zod parçası gidiyordu). Vitrin formunun şeması panelin şemalarıyla aynı dosyada durmaz: panel şeması başka modüllerin şemalarını içe aktarınca hepsi forma gider (kart 0248: sipariş şemaları ödeme adımının adres ve fatura şemalarını alınca havale bildirimi sayfası 19 KB büyüdü; vitrinin şemaları `havale-bildirimi-semalari.ts`'e ayrıldı).
- Derleyici bir modülü, bütün tarayıcı dosyalarının ondan kullandığı her şeyle paketler (kart 0295, karar 0172): panelin ya da kataloğun bir ortak modülden kullandığı her şey vitrine de gider. Yalnız panelin kullandığı kod (ikon, dosya yükleme istemcisi) ayrı modüldedir; hazır tema tabloları tarayıcıda hiç içe aktarılmaz. İkisini `cekirdek/testler/vitrin-kodu.test.ts` denetler; öteki ortak modüllere panel kodu eklemek yalnız disiplindir. Kod büyüyünce kaynağı derleme kaynak haritasıyla dosya dosya ölçülür (kartın Sonuç bölümündeki yol).
- İlk ekranda görünen görsel öncelikli yüklenir (`oncelikli`: tembel değil, `fetchPriority="high"`); listede ilk `oncelikliKartSayisi` kart.
- Görselleri cihaza uygun boyutta, modern biçimde ve ekrana girdikçe yükle.
- Hangi verinin ne kadar süre önbellekte tutulacağını ve ne zaman silineceğini tanımla.
- Fiyat, stok ya da içerik değişince ilgili önbelleği hemen sil.
- Sepet ve ödeme akışını beklenen en yoğun trafiğin katlarıyla düzenli yük testinden geçir.
