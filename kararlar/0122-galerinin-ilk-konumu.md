# 0122 · Ürün galerisinin ilk konumu satır içi küçük bir betikle kurulur

## Tarih

2026-11-14

## Karar

Ürün sayfasının kaydırmalı galerisi (`UrunGalerisi`), seçili birleşimin görseli ilk öğe değilse şeridin hemen ardında küçük bir satır içi betik taşır. Betik şeridi, genişliği oluştuğu ilk karede o öğeye kaydırır. Sayfa akışla geldiği için şerit önce gizli bir kapta (genişlik 0) çizilebilir; betik en çok iki saniye her karede yeniden dener. Betik yalnız bir sayı taşır, metin ya da kullanıcı girdisi taşımaz. Sayfa bağlanınca galerinin kendi etkisi konumu aynı bulur, kaydırmaz.

## Neden

Müşteri gezisinde (2026-11-13) ölçüldü: telefonda `?secenek-renk=beyaz` adresiyle açılan sayfada seçim Beyaz görünürken galeri 0,5–1 saniye siyah tişörtü gösteriyordu. Şerit HTML'de ilk öğede başlıyor, seçili öğeye kaydırma sayfanın kodu bağlanınca yapılıyordu. Sayfanın kodu engellendiğinde eski hâlde şerit hep ilk öğede kalıyordu (ölçüldü).

## Düşünülen diğer yollar

- **CSS ile başlangıç konumu (`scroll-initial-target`):** Bütün tarayıcılarda yok.
- **Sunucuda seçili öğeyi önce çizmek ya da öncekileri gizlemek:** Galerinin sırası ve küçük görsellerle eşleşmesi bozulurdu, bağlanınca düzen kayardı.
- **Satır içi stil ya da değişkenle kaydırma (transform):** Denetim satır içi ölçüyü ve değişkenle değeri yasaklar (karar 0076). Kaydırmadan önce parmakla kaydırma yanlış yerden başlardı.
- **Tek seferlik betik:** Akışla gelen sayfada şerit gizli kaptayken çalıştı, genişlik 0 olduğu için kaydırmadı (tarayıcı testinde kırmızı).

## Sonuçları

- Sitede ileride içerik güvenlik politikası (CSP) açılırsa satır içi betik izin ister (nonce ya da hash). O iş bu betiği de kapsamalıdır.
- Seçili öğe görünür olduğu ilk karede gelir; akışla gizli kaptan taşınan sayfada bir kare eski konum görünebilir (ölçülmedi).
- Tarayıcı testi sayfanın kodunu engelleyerek telefonda görünen görseli ölçer, kod yüklüyken hidrasyon uyarısı olmadığını da ölçer.
