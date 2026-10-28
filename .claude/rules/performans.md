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

- Hız hedeflerine uy: gerçek ziyaretçilerin büyük çoğunluğu için sayfanın ana içeriği 2,5 saniye içinde görünsün, tıklamaya tepki 200 milisaniyeyi geçmesin, yükleme sırasında kayma çok düşük kalsın.
- Vitrin sayfalarında indirilen kodun üst sınırını aşma.
- Görselleri cihaza uygun boyutta, modern biçimde ve ekrana girdikçe yükle.
- Hangi verinin ne kadar süre önbellekte tutulacağını ve ne zaman silineceğini tanımla.
- Fiyat, stok ya da içerik değişince ilgili önbelleği hemen sil.
- Sepet ve ödeme akışını beklenen en yoğun trafiğin katlarıyla düzenli yük testinden geçir.
