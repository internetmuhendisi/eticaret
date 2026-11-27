# 0194 · Siparişleri dışa aktarma

## Tarih

2026-11-27

## Karar

Siparişler temel pakette CSV dosyasına aktarılır (kullanıcı kararı, karar 0185; kart 0316, plan `planlar/siparisleri-disa-aktarma.md`). Uygulamanın teknik kararları:

- Kapsam listenin süzgeçleridir (durum sekmesi, tarih, ödeme yöntemi, kargo firması, sıralama) ya da seçilen siparişler. Arama kutusundaki metin kapsamda yoktur: aranan metin kişisel bilgi taşıdığı için adrese yazılmaz (karar 0145), pencere bunu söyler. Liste ile dosya aynı koşuldan okunur (`listeninSiparisleri`).
- Dosya her zaman arka planda hazırlanır. "Dosyayı hazırla" pencereyi kapatır; listenin üstündeki kutu durumu söyler, hazır olunca "Dosyayı indir" bağlantısını gösterir. İndirme kendiliğinden başlamaz.
- CSV: UTF-8 ve BOM, CRLF; ayraç sitenin ondalık ayırıcısından (virgülse noktalı virgül); tutar binlik ayırıcısız, sitenin ondalık ayırıcısıyla sayı; formüle benzeyen metin başına ' konarak yazılır. Yazıcı ortaktır (`cekirdek/metinler/csv.ts`), satış raporu (kart 0317) da kullanır.
- Dosya kişisel veri taşır: yalnız isteyen indirir, her indirme değişiklik kaydına (kapsam, düzen, sayı; içerik değil) girer, kayıt dosyasıyla 24 saat sonra silinir. Bir dosyada en çok 50.000 sipariş.
- Kişisel bilgisi silinmiş siparişte kişisel sütunlar boştur; il, ilçe, ülke ve tutarlar kalır (temizliğin bıraktıkları).

## Neden

- Arama süzgeçlere göre geçicidir ve adreste yoktur; dosyanın kapsamı sayfa yenilendiğinde de aynı olmalıdır.
- Arka planda hazırlama büyük dosyada isteği uzatmaz; tek yol hem küçük hem büyük dosyayı aynı biçimde yürütür.
- Türkçe Excel CSV'yi noktalı virgülle böler; binlik ayırıcılı tutar sayı olarak okunmaz.
- Formül hücresi, müşterinin yazdığı bir metnin dosya açılınca çalışmasını önler (CSV enjeksiyonu).
- Dosya indirildikten sonra sunucuda kalmasının faydası yoktur; kısa saklama kişisel veriyi azaltır.

## Düşünülen diğer yollar

- **Aramayı da kapsamak:** Ekran aranan metni uca gönderebilirdi; ama "listedeki N sipariş" sayısı sunucuda aramasız hesaplanıyor ve kapsam adresle tekrarlanamazdı. Seçilmedi; aranan siparişler seçilerek aktarılır.
- **Küçük dosyayı hemen indirmek:** İki yol olurdu (hemen ve arka planda). Seçilmedi.
- **İndirmeyi pencere açıkken kendiliğinden başlatmak:** Sayfa yenilemesiyle durumu soran kutu tek yerdir; pencere kapatılınca da çalışır. Seçilmedi.
- **Ayracı ayar yapmak:** Sitenin para biçimi zaten ondalık ayırıcıyı söylüyor. Seçilmedi.

## Sonuçları

- Telefon numarası "+" ile başladığı için dosyada başında ' ile görünür (formül koruması).
- Dosya 24 saatten sonra yeniden hazırlanmalıdır.
- Sayfa açıkken başka sekmede başlatılan dışa aktarma kutuda sayfa yenilenince görünür.
- Panel içi bildirim (kart 0280) yoktur; hazır dosya listenin kutusunda görünür.
