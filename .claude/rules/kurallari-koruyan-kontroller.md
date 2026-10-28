# Kuralları koruyan kontroller

Bir kural yalnız yazılı kalırsa zamanla çiğnenir. Bu yüzden önemli her kuralı otomatik bir kontrole bağla. Kontrolü olmayan kuralı "yalnız disiplin" diye işaretle. Bir kural ancak yazım anında ya da yayından önce yakalanıyorsa korunmuş sayılır, gecelik tarama yalnız ikinci ağdır. Kontroller proje ilerledikçe kurulur, kontrolü henüz kurulmamış kurala da uy.

| Kontrol | Ne yapar | Ne zaman | Durum |
|---|---|---|---|
| Tür kontrolü | Kayıtta olmayan değeri, eksik alanı ve yanlış türü engeller. | Her yayında | Kuruldu (0005): `pnpm tur-kontrolu` |
| Kod denetim kuralları | Ham renk, ham HTML öğesi, elle tablo, elle genişlik, elle biçimlendirme, şemasız uç, güvensiz sorgu gibi yasakları hata sayar. | Kod yazılırken ve her yayında | Kısmen kuruldu (0006, 0008): `pnpm denetim`, liste aşağıda |
| Kayıt öncesi kontroller | Kod biçimini, metin anahtarlarını, karar kaydı numaralarını kontrol eder, gizli bilgi yazılmışsa kaydı durdurur. | Her kayıtta | Kısmen kuruldu (0006): biçim ve denetim kırmızıysa kayıt durur. Gizli bilgi dosyasını Claude'un kalkanı durdurur. Metin anahtarı ve karar numarası kontrolü sonra. |
| Testler | Birim, entegrasyon, yetki, veri ayrımı, hesaplama, ödeme, eşzamanlılık, iade ve sözleşme testleri. | Her yayında | Kısmen kuruldu (0007): araçlar ve `pnpm testler`, gerçek testler ilgili kartlarda. Kart 0010: çekirdekte ve bileşenlerde site adı geçmez (`cekirdek/testler/site-adi-yok.test.ts`) |
| Site klasörü doğrulaması | Kimliği ve ayarları şemadan geçirir; şemada olmayan ayarı, yanlış türü, eksik kimlik alanını ve klasörle uyuşmayan kod adını durdurur. Bozuk örneklerin kırmızıya düştüğünü gösterir. | Her yayında ve uygulama açılırken | Kuruldu (0010): `pnpm site-dogrula`, testi `pnpm birim-testleri` içinde |
| Güvenlik kontrolleri | Güvenlik başlıkları, çerez ayarları, dosya yükleme ve dış paket açıkları. | Her yayında | Kurulmadı |
| Veritabanı değişikliği denemesi | Değişikliği canlının kişisel bilgileri silinmiş kopyasında uygular. | Veritabanı değiştiğinde | Kurulmadı |
| Belge ve bayatlık kontrolü | Belgenin ve yardım içeriğinin güncellendiğini, kural dosyasının satır sınırını aşmadığını kontrol eder. | Her yayında | Kurulmadı |
| Metin kontrolleri | Koda gömülü metni, yasak terimi, yasak iddiayı ve sabit sayıyı arar. | Her yayında | Kısmen kuruldu (0006): ekrana gömülü metin denetimde |
| Hız ve boyut ölçümü | Sayfa hızını ve indirilen kod boyutunu ölçer. | Her yayında | Kurulmadı |
| Ekran ölçümü | Sayfaları üç genişlikte açar, yatay kaydırma, konsol hatası, erişilebilirlik ve görüntü farkı arar. | Yayından önce ve sonra | Kurulmadı |
| Çakışma kontrolü | Aynı dosyanın aynı anda iki işte değiştirilmesini durdurur. | Dosya değiştirilirken | Kurulmadı |
| Yayın komutu | Veritabanı değişikliğini sırayla uygular, sağlık kontrolü yapar, sorun çıkarsa önceki sürüme döner. | Her yayında | Kurulmadı |
| Site komutları | Yeni site kurma, site güncelleme ve siteyi mağaza sahibine teslim etmeyi kontrollerden geçirerek yapar. | Komut çalışınca | Kurulmadı |
| Zamanlanmış kontroller | Siteyi, ödemeyi, e-postayı ve kuyruğu izler, ödemeleri karşılaştırır, geri yükleme provası yapar. | Düzenli aralıklarla | Kurulmadı |
| Gecelik tarama | Kopya biçimleyici, eksik yetki, güvenlik açığı, yavaş sorgu gibi sınıfları bütün kodda arar, bulguyu iş olarak yazar. | Her gece | Kurulmadı |
| İhlal listesi | Eski ihlalleri adıyla tutar, yeni ihlali durdurur, düzeltilen ihlali siler. Liste yalnız küçülebilir. | Her yayında | Kurulmadı |
| Kendi kendini denetleme | Her kontrolün bilerek bozulmuş bir örneği yakaladığını gösterir. Hiç kırmızıya düşmeyen kontrol koruma sayılmaz. | Kontrol değişince ve düzenli aralıklarla | Kısmen kuruldu (0006): kod denetimi ve biçim için `pnpm denetim-kendi-testi` |

Bir kontrol kurulunca ya da genişleyince bu tablonun Durum sütunu aynı değişiklikte güncellenir.

## Kod denetim kuralları

Kod denetimi ve biçim Biome ile yapılır (karar 0017). Ayar kökteki `biome.json` dosyasındadır, projeye özel kurallar `denetim/kurallar/` klasöründedir.

- `pnpm denetim`: bütün çalışma alanında biçimi ve denetimi kontrol eder, dosyaya dokunmaz. Uyarı da hata sayılır.
- `pnpm bicimle`: biçimi düzeltir.
- `pnpm denetim-kendi-testi`: her bozuk örneğin (`denetim/bozuk-ornekler/`) beklenen kuralla yakalandığını gösterir. Bir kural eklenince ya da değişince onun bozuk örneği de eklenir.

Belge dosyaları (`.md`) biçimlendirilmez ve denetlenmez.

| Yasak | Durum |
|---|---|
| Ham renk değeri (`#rrggbb`, `rgb()`, `hsl()`, `oklch()`...). `bilesenler/tasarim-degerleri/` muaftır. | Hata |
| Ekrana gömülü metin: öğenin içine yazılan metin, `{"..."}` ve `alt`, `title`, `placeholder`, `aria-label` gibi alanlara yazılan metin | Hata |
| Güvensiz sorgu: sorgu çağrısına metin birleştirerek ya da `${...}` ile değer gömmek. Sorgu önce bir değişkende kurulursa yakalanmaz. | Hata, kart 0011'de veritabanı aracına göre sıkılaşır |
| `any` türü | Hata |
| Biome'un önerilen kuralları | Hata |
| Ham HTML öğesi (düğme, giriş alanı, seçim kutusu, pencere) | Sonra: bileşen kütüphanesi yazılınca |
| Elle tablo | Sonra: liste motoru yazılınca |
| Elle genişlik ve ölçü | Sonra: tasarım değerleri yazılınca |
| Elle biçimlendirme: biçimleyici (`cekirdek/metinler/bicimleyici.ts`) dışında `Intl` ve `toLocale...String` | Hata (0008) |
| Şemasız uç | Sonra: ilk uçlar yazılınca |
| Koda gömülü sunucu metni ve sabit sayı | Sonra: metin kontrolleriyle |
