# 0140 · Ödeme adımı: ödeme oturumu ve stok ayırma

## Tarih

2026-11-17

## Karar

Ödeme adımı (kart 0213) tek sayfadır (karar 0132): `/odeme`, sade çerçeveyle. Müşteri "Siparişi onayla"ya basınca bilgileri bir **ödeme oturumuna** yazılır (`odeme_oturumlari`: e-posta, teslimat, fatura, not, sepetin kalemleri, sunucunun toplamı, metin sürümüyle onaylar) ve sepetin takibi açık birimleri aynı işlemde **stok ayırma süresi** kadar ayrılır (`stok_ayirmalari`, `stokAyir`). Sipariş kart 0214'te oturumdan kurulur.

Kullanıcının kararları (kart 0213):

| Soru | Karar |
|---|---|
| Ödeme yöntemi bölümü | Kart 0214'te eklenir; ödeme yöntemleri orada kurulur. Kart 0213'te sayfa iletişim, teslimat, fatura, not ve onaylarla biter. |
| Stok ne zaman ayrılır | Müşteri "Siparişi onayla"ya basınca (form doğrulandıktan sonra). Sayfa açılınca ayrılmaz. |
| Ayrılmış son ürün vitrinde | Stokta görünür. Vitrin, sepet ve stok durumu fiziksel stoğu gösterir; ödemeye geçen ikinci müşteriye "başka bir ödemede ayrılmış" denir. |

Teknik kurallar:

- Ayrılabilir miktar stoktan, süresi dolmamış ayırmalar düşülerek bulunur. Ayırma birimin stok satırını kilitler: aynı anda iki ödeme sıraya girer, son ürün iki kez ayrılmaz. Süre veritabanının saatiyle karşılaştırılır; süresi dolan ayırma sayılmaz, satırı oturumuyla birlikte silinir.
- Oturum açılmaz: sepet ödemeye geçilemez durumdaysa ya da müşterinin görmediği bir değişiklik varsa (fiyat değişmiş, adet stoğa ya da sınıra inmiş). Müşteri güncel özeti görüp yeniden onaylar.
- Müşterinin bir önceki oturumu (sekmede saklanır) yeniden basınca aynı işlemde silinir, ayırması serbest kalır; yalnız aynı müşterinin (üye olmayanda yine üye olmayanın) oturumu silinir.
- Tutar tarayıcıdan gelmez; vergi teslimat ve fatura adresinin bölgesiyle `sepetiHesapla` içinde hesaplanır (`vergiAdresi`, karar 0061). Sepet ucu ödeme adımının bölgelerini de alır, özet aynı hesaptan gelir.
- Onaylar: ön bilgilendirme ve mesafeli satış zorunlu, metin sürümüyle oturuma yazılır (`siparisOnayTurleri`). Pazarlama izni yalnız işaretlenince verilir: üye müşteride hesabın onaylarına yeni satır olarak da yazılır (işaretsiz bırakmak var olan izni geri almaz).
- Ödemede hesap açma müşteri kaydının işleviyle (`musteriHesabiAc`, karar 0051), oturumla aynı işlemde yapılır.
- Kişisel veri taşıdığı için siparişe dönmeyen oturum süresi dolduktan 24 saat sonra zamanlı işle silinir.
- Üç yeni mağaza ayarı: `uyeOlmadanAlisveris` (açık), `telefonZorunlu` (açık), `stokAyirmaSuresi` (15 dakika, 5–60). Örnek Mağaza varsayılanları kullanır.
- Telefon ülke içindeki yazılışla da girilir, ülkenin veri dosyasındaki telefon koduyla uluslararası biçime çevrilir. Kurumsal faturanın vergi numarası ülkenin kuralına uyan herhangi bir işletme türüyle geçer (şirketin vergi kimlik numarası ya da şahsın kimlik numarası; kart 0091'in kuralları).
- Tarayıcıdan kapıya istek `kapiyaIstek` ile gider (karar 0139). Uçlar: herkese açık `odeme` (üye olmayan, robot korumalı, sıkı sınır, tema demosunda kapalı) ve müşteri `odeme` (`odeme.kendi.baslat`).

## Neden

- Ayırma düğmeye basınca yapılırsa sayfayı açıp bırakan ziyaretçi ya da robot son ürünleri kilitleyemez; ayırmanın asıl işi kartla ödemede bankaya gidip gelinen süreyi korumaktır (kart 0215).
- Vitrinin fiziksel stoğu göstermesi bütün stok hesaplarına dokunmaz; ayırma kısa sürelidir ve ödemeye geçen ikinci müşteriye açıkça söylenir.
- Onayların ödeme oturumunda durması üye olmayan müşterinin de onayını sürümüyle saklar; sipariş onları oturumdan alır.
- Görülmeyen değişiklikte oturumu açmamak müşterinin onaylamadığı tutarla sipariş vermesini önler.

## Düşünülen diğer yollar

- **Sayfa açılınca ayırma:** Müşteri formu doldururken stok tutulurdu, ama sayfayı açıp bırakan herkes stoğu kilitlerdi. Kullanıcı seçmedi.
- **Ayrılan ürünü vitrinde tükenmiş göstermek:** Ödemeyi bırakan müşteri yüzünden ürün 15 dakika satılmaz görünürdü; bütün stok sorgularına ayırma koşulu girerdi. Kullanıcı seçmedi.
- **0213 ile 0214'ü birleştirmek:** Sayfa tek kartta biterdi, iş ve kontrol çok büyürdü. Kullanıcı seçmedi.
- **Onayları müşteri onayları tablosuna yazmak:** Üye olmayan müşterinin hesabı yoktur; tablo hesaba bağlıdır.
- **Ayırmada stoktan düşmek:** Stok geçmişine her ödeme denemesi girer, süre dolunca geri koymak için ayrı iş gerekirdi.

## Sonuçları

- Kart 0214 siparişi oturumdan kurar, stoğu `stokDus` ile düşerken başka oturumların süresi dolmamış ayırmalarını hesaba katar, oturumun ayırmasını siler; ödeme yöntemi bölümünü ve üyenin önceki adresinin önerisini ekler. O güne kadar onaydan sonra müşteriye yalnız ayırmanın bittiği saat söylenir.
- Ayırma vitrinde görünmez: son ürünü sepetine koyan ikinci müşteri ancak onaylayınca öğrenir.
- Ön bilgilendirme formu ve mesafeli satış sözleşmesi bugün siparişin bilgileriyle dolan yer tutucu metindir; gerçek metin, iade koşulları ve onay cümleleri kart 0063'te hukukçuyla gelir. Sade çerçevenin altında bugün yalnız aydınlatma metni ve telefon vardır; öteki yasal metinlerin sayfaları kart 0063'le gelir.
- Telefonun ülke içi yazılıştan çevrilmesi yalnız veri dosyasında telefon kodu olan ülkede çalışır.
