# 0152 · Vitrinin tarayıcı koduna yalnız vitrin metinleri gider

## Tarih

2026-11-20

## Karar

Ekran metinleri yine yalnız `cekirdek/metinler/tr.json`'da yazılır. Vitrinin tarayıcı kodu bütün dosyayı değil, ondan üretilen `vitrin-metinleri.json`'u alır (kart 0253):

- Vitrin metinleri `vitrinMetinBolumleri` (`cekirdek/metinler/vitrin-bolumleri.ts`: `ortak`, `vitrin`, `eklenti`) bölümleridir. Dosya `pnpm vitrin-metinleri` ile üretilir, elle yazılmaz; test üretilenle aynı olduğunu denetler.
- Tarayıcıdaki `useMetin` (`istemci-metni.tsx`) yalnız vitrin metinlerini okur ve yalnız bu bölümlerin anahtarlarını kabul eder (`VitrinMetinAnahtari`); başka bölümün anahtarı tür kontrolünde hatadır. Panelin ve bileşen kataloğunun ekranları bütün dosyayı `usePanelMetni` (`panel-metni.tsx`) ile okur.
- `doldur` kendi dosyasındadır (`cekirdek/metinler/doldur.ts`); dil listesi ve varsayılan dil `dil.ts`'te. Tarayıcı kodu e-posta şablonunu ve `metin.ts`'i içe aktarmaz: ikisi de bütün dosyayı taşır. Panel ve katalog dışındaki her tarayıcı dosyasının içe aktarma zinciri testte izlenir (`cekirdek/metinler/testler/vitrin-metinleri.test.ts`).
- Kod sınırı ölçülen değere göre aşağı çekildi (Sonuçları).

## Neden

- Bütün dosya sıkıştırılmış 34 KB'tı, vitrinin kullandığı bölümler 12 KB. Panelin (14,6 KB), katalog ve geliştirmenin (5,4 KB) ve ayar açıklamalarının (3,2 KB) metinleri her vitrin sayfasıyla iniyordu (kart 0194'ün bulgusu). Her yeni panel metni bütün vitrin sayfalarını büyütüyordu: kart 0239 havale bildirimini 319'dan 322 KB'a çıkardı, sınır 320 KB.
- Tek kaynak korunur: metin yine bir yerde yazılır; vitrinin dosyası üretilir ve test eski kalmasını yakalar.
- Tür ayrımı, vitrin bileşeninin panel anahtarını okuyup tarayıcıda "Metin bulunamadı" hatası vermesini derlemeden önce yakalar.

## Düşünülen diğer yollar

- **Metinleri sayfaya HTML içinde vermek (kök düzen sağlayıcıya sözlük geçer):** kod ölçümü küçülürdü, aynı baytlar her sayfanın HTML'ine taşınırdı; indirilen toplam azalmazdı.
- **tr.json'u bölüm bölüm dosyalara ayırmak:** üretim gerekmezdi; metin kuralı, eklenti komutu ve metin aracı değişirdi, tek dosya kuralı bozulurdu.
- **Her sayfanın kullandığı anahtarları derlemede çıkarmak:** en küçük sonuç, ama anahtarlar kayıt dosyalarında değişkenle seçiliyor; statik çıkarma eksik kalır ve sessizce boş metin çizilirdi.
- **Kod sınırını yükseltmek:** kullanıcı seçmedi; sınır büyümeyi durdurmak içindir.

## Sonuçları

- `tr.json`'a vitrin metni ekleyen iş `pnpm vitrin-metinleri`'yi çalıştırır; unutursa birim testi kırmızıdır.
- Panelin ve vitrinin ortak kullandığı tarayıcı bileşeni (ödeme alanları, elle sipariş) vitrin okuyucusunu kullanır ve yalnız vitrin anahtarı okur.
- Panelin tarayıcı kodu bütün dosyayı taşımaya devam eder; panelin sınırı yoktur.
- Sunucunun okuyucusu değişmez.
- Ölçüm (2026-11-20, temiz deneme veritabanı, `pnpm hiz-olcumu`): her vitrin sayfası yaklaşık 20 KB küçüldü; havale bildirimi 319'dan 299'a, sipariş takibi 315'ten 294'e, ana sayfa 288, ürün 298 KB. Kod sınırı 320'den 305 KB'a çekildi: en büyük sayfanın üstünde yeni bir ekranı taşıyacak kadar pay, büyümeyi yine erken yakalar.
