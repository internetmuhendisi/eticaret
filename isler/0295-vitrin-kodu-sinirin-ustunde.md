# 0295 · Vitrinin kodu 305 KB sınırının üstünde

## Amaç

Hat 45112363642'de (kart 0293 bitti kaydı, 9395fae) hız ölçümü kırmızıya düştü. Üç sayfa, sıkıştırılmış JavaScript için konan 305 KB sınırını aştı (`cekirdek/testler/hiz/hedefler.ts`). Bu sayfaların hız, kayma ve tepki değerlerinin hepsi hedefin içinde:

| Sayfa | Son yeşil hat 44851382823 (kart 0252, 21 Kasım) | Hat 45112363642 (23 Kasım) |
|---|---|---|
| Ürün | 301 KB | 306 KB |
| Havale bildirimi | 301 KB | 307 KB |
| Sipariş takibi | 300 KB | 305 KB (yuvarlanmış, sınırın üstünde) |

Ara hatlar hız ölçümüne gelmeden daha önceki adımlarda durdu. Bu yüzden büyüme 21 Kasım'dan beri görülmedi. Arada ana dala giren kartlar: 0258–0266, 0094, 0290–0293. Büyümeyi hangisinin yaptığı ölçülmedi.

Bölüm: Vitrin.

## Olmazsa olmazlar

- Önce ölçülür: 44851382823 ile 9395fae arasında vitrin sayfalarına hangi parçanın girdiği (derleme çıktısı ve tarayıcıdaki istekler, kayıt kayıt ya da ikiye bölerek).
- Büyüme panel ya da ortak kod yüzünden vitrine sızdıysa sızıntı kapatılır ve bir testle korunur; yeniden sızınca test kırmızıya düşer (kart 0253'ün metin testine benzer).
- Büyüme vitrinin gerçekten kullandığı koddansa küçültme yolu seçilir; sınır gevşetilmez (sınır kart 0253'te 320 KB'tan 305 KB'a indi).

## Sınırlar

- Kod sınırı değiştirilmez.
- Kodu genel olarak küçültmek kart 0194'ün işidir; bu kart yalnız 21 Kasım'dan sonraki büyümeyi geri alır.
- Davranış ve görünüş değişmez.

## Bitti sayılır

- Büyümenin kaynağı ölçüldü, karta yazıldı.
- Hız ölçümü yerelde hattın koşulunda yeşil; her sayfanın kod boyutu karta yazıldı.
- Sızıntıysa koruyan test, düzeltme geri alınınca kırmızı.
- Bağımsız kontrol yapıldı.

## Sonuç

Karar 0172.

### Büyümenin kaynağı

Yöntem:
- Çekirdek canlıdaki gibi derlendi (`next build`), yalnız ölçüm için kaynak haritası açıldı (kayda girmedi).
- Sayfanın tarayıcıya giden parçaları sayfanın istemci listesinden (`page_client-reference-manifest.js`) ve kök parçalardan okundu.
- Her parçanın baytları kaynak haritasıyla özgün dosyalara dağıtıldı. Aynı ölçüm 21 Kasım'ın kaydında (`a3b8d15`), kart sonlarında ve ana dalda yapıldı.

Bu yöntemle havale bildirimi sayfası (sıkıştırılmış):

| Kayıt | KB |
|---|---|
| a3b8d15 (21 Kasım, son yeşil hat) | 295,0 |
| 0258 sonu | 296,3 |
| 0259 sonu | 297,4 |
| 0261 sonu | 298,3 |
| 0262 sonu | 298,5 |
| 0263 sonu | 299,0 |
| ana dal (842a91d) | 301,6 |

Hız ölçümü aynı sayfada bu yöntemden yaklaşık 6 KB fazla sayar (aktarılan boyut).

Büyümenin kaynakları (21 Kasım'a göre; dosya başına sıkıştırılmamış bayt, ikonlarda ayrıca sıkıştırılmış pay):
- **İkonlar:** Vitrine 55 yerine 70 ikon gidiyordu (sıkıştırılmış 4,6'dan 6,1 KB'a). İkon sözlüğü tek dosyaydı; panelin menü sayfaları, eylemleri, liste sıralaması, tarih süzgeci, biçimli metin alanı ve dosya yükleme ikonları da vitrine gidiyordu. Sızıntı.
- **Tema tabloları (+3,1 KB):** Hazır temaların değer tabloları (`degerler.ts`) katalogdaki renk alanı örneği (kart 0260) yüzünden vitrine giriyordu. Ölçüldü: 21 Kasım'da vitrinde hiçbir temanın rengi yoktu, ana dalda Canlı Çarşı'nın 40 rengi de vardı. Sızıntı.
- **floating-ui (+2,8 KB):** Kart 0259'dan beri `autoPlacement` ve `inline` da paketleniyor. Uygulamada onları içe aktaran dosya yok (Tiptap'ın menü eklentileri istemci çizgesinde değil; 0263'ten önce de vardı, ölçüldü). Derleyicinin modül birleştirme kararından geliyor, kodda düzeltme noktası bulunmadı.
- **`istemci.ts` (+0,8 KB):** Panelin dosya yükleme işlevi (`kapiyaYukle`, kart 0094) vitrinin bütün formlarının kullandığı dosyadaydı. Sızıntı.
- **Biçimleyici (+0,8 KB) ve sipariş kaydı (+0,75 KB):** Panel için eklenen işlevler ve adlar. Ortak modül, bölünmedi.
- **Vitrinin kendi kodu:** Yan pencere (alt çubuk) ve form alanı (+0,6 KB, kart 0259), vitrin metinleri (+0,3 KB).
- Sıkıştırılmış toplam büyümenin (6,6 KB) yaklaşık 2 KB'ı hiçbir dosyaya bağlanamadı: parçaların bölünmesi ve sıkıştırmanın dağılımı (ana dalda parça sayısı 20'den 21'e çıktı).

Mekanizma: Derleyici bir modülü, bütün tarayıcı dosyalarının ondan kullandığı her şeyle paketliyor. Panelin ya da kataloğun bir ortak modülden kullandığı şey vitrine de gidiyor.

### Yapılan

- Panelin ikon sözlüğü (`bilesenler/ikonlar/panel-sozlugu.ts`): 23 ikon. `PanelIkon` ve `panelIkonu` ile çizilir; vitrinde panel ikon adı tür kontrolünde hata verir.
- Katalog örneği tema tablosu yerine sayfanın CSS değişkenini okur.
- `kapiyaYukle` `cekirdek/kapi/yukleme-istemcisi.ts`'e taşındı.
- Koruyan test: `cekirdek/testler/vitrin-kodu.test.ts`. Zincir izleme kart 0253'ün testiyle ortak yardımcıda (`cekirdek/testler/ice-aktarma-zinciri.ts`).

### Kod boyutu (hız ölçümü, yerelde hattın koşulunda)

Koşul: temiz deneme veritabanı ayrı kutuda, `taskset -c 0,1`, boş dosya klasörü. 14/14 yeşil, sınır 305 KB.

| Sayfa | KB |
|---|---|
| Ürün | 304 |
| Havale bildirimi | 304 |
| Sipariş takibi | 303 |
| Kategori | 302 |
| Marka | 302 |
| Etiket | 302 |
| Arama | 302 |
| Ödeme | 295 |
| Favoriler | 295 |
| Kayıt | 295 |
| Ana sayfa | 294 |
| Giriş | 294 |
| Sepet | 293 |
| Bulunamadı | 293 |

Ana dal (düzeltmeden önce) yerelde hız ölçümüyle ölçülmedi; hat 45112363642'de havale bildirimi 307, ürün 306, sipariş takibi 305 KB'tı. İlk iki düzeltmeden (ikon sözlüğü, tema tabloları) sonra aynı koşulda havale bildirimi 305 (kırmızı), ürün 305, sipariş takibi 304 KB; yükleme istemcisi ve iki parçanın ikonlarıyla yukarıdaki değerler. Bu yöntemle havale bildirimi 301,6'dan 297,8 KB'a indi. Sınıra pay yaklaşık 1 KB. Kalan büyüme (floating-ui, biçimleyici, sipariş kaydı) kodda bu kartla düzeltilemedi; genel küçültme kart 0194'tedir.

## Durum

yapılacak
