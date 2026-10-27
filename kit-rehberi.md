# Başlangıç kiti rehberi

Bu kitteki her klasör ve dosya ne işe yarar, onunla hangi bölümde çalışacağız. Kitteki her şey düz Türkçe yazılıdır,
açıp okuyabilirsin. Hepsi senin: kendi işine göre değiştirebilirsin. Bir kuralı değiştirdiğinde nedenini bir karar
kaydına yaz (Bölüm 2).

## Proje klasörü

| Klasör ya da dosya | Ne işe yarar | Ne zaman |
|---|---|---|
| `CLAUDE.md` | Kural dosyası. Claude her oturumun başında ilk bunu okur: proje ne, kim neye karar verir, değişmez kurallar, yasaklar, hafıza klasörleri nerede. Proje bölümü boş gelir, Claude onu ilk isteğinden ve sorularına verdiğin cevaplardan doldurur. | Bölüm 2 |
| `.claude/settings.json` | Ayar dosyası. Claude'un sormadan yapabileceği ve asla yapamayacağı işler. | Bölüm 1, 2. ders |
| `.claude/rules/` | Konu konu kurallar (aşağıda tek tek). Claude bir konuda çalışırken yalnız o konunun dosyasını okur. | Konusu geldikçe |
| `.claude/commands/` | Kendi komutların. Sık yaptığın işleri tek kelimeye bağlarsın. Boş gelir. | Bölüm 3 |
| `temel-paket.md` | Bir mağazanın satış yapabilmesi için olmazsa olmaz parçaların listesi. Önce bunlar kurulur. | Bölüm 1, 4. ders |
| `eklentiler/` | Eklenti kataloğu ve eklenti tarifleri. Temel pakette olmayan her özellik burada bir tariftir. | Bölüm 11'den itibaren |
| `kararlar/` | Karar kayıtları: neyi neden seçtik, hangi yollar vardı. İçinde şablon var. | Bölüm 2 |
| `tarihce/` | Ne zaman ne yaptığımızın kısa kaydı. "En son ne yaptık?" sorusunun cevabı. | Bölüm 2 |
| `planlar/` | Claude'un büyük işlerden önce yazdığı planlar ve sitenin ayarları. | Bölüm 2 ve 4 |
| `isler/` | İş listesi: yapılacak her iş kendi kartında. | Bölüm 3 |

Hafıza klasörlerinin (kararlar, tarihçe, planlar, işler) her birinde nasıl kullanıldığını anlatan kısa bir README var.

## Kural dosyaları (`.claude/rules/`)

| Dosya | Ne anlatır | Ne zaman |
|---|---|---|
| `calisma-duzeni.md` | Bir şeyi tek yerde tanımlamak, işe plan ve kartla başlamak, bitti listesini kontrol etmek | Bölüm 3 |
| `belgeleme.md` | Karar kayıtları ve tarihçe nasıl yazılır | Bölüm 2 |
| `klasor-duzeni.md` | Çekirdek, site klasörleri ve bileşenler nerede durur, dosyalar nasıl adlandırılır | Bölüm 2 ve 4 |
| `cok-siteli-yapi.md` | Siteye özel kod çekirdeğe yazılmaz, her site hangi çekirdek sürümünde | Bölüm 4 ve 17 |
| `kurallari-koruyan-kontroller.md` | Kuralların otomatik kontrollerle korunması | Bölüm 5 ve 20 |
| `ayarlar.md` | Siteden siteye değişen davranış koda değil ayara yazılır | Bölüm 5 |
| `veritabani.md` | Bir sitenin verisi başka sitede asla görünmez, veri nasıl saklanır | Bölüm 5 |
| `metinler.md` | Ekrandaki metinler, dil, para birimi ve biçimi, tarih ve saat, hata mesajları | Bölüm 1 ve 5 |
| `kayit-dosyalari.md` | Ürün türü, sipariş durumu, ödeme yöntemi gibi listelerin tek yerde tanımlanması | Bölüm 5 ve 8 |
| `guvenlik.md` | Şifreler, giriş, deneme sınırı, gizli bilgiler | Bölüm 7 |
| `yetki.md` | Roller ve izinler | Bölüm 7 ve 14 |
| `sunucu-arayuzu.md` | Sunucunun ekranlarla konuşma biçimi | Bölüm 8 |
| `e-ticaret-is-kurallari.md` | Fiyat, ülkeye bağlı olmayan vergi yapısı, stok, sepet, ödeme, sipariş, iade kuralları | Bölüm 8, 12 ve 13 |
| `tasarim-sistemi.md` | Renk, yazı, boşluk gibi tasarım değerleri tek yerden gelir | Bölüm 10 |
| `bilesenler.md` | Düğme, alan, pencere gibi bütün arayüz parçaları ortak kütüphaneden gelir | Bölüm 10 |
| `vitrin.md` | Ana sayfa, kategori ve ürün sayfalarının yapısı | Bölüm 11 |
| `telefon-gorunumu.md` | Her ekran telefonda, tablette ve bilgisayarda kontrol edilir | Bölüm 11 |
| `performans.md` | Sayfaların hız hedefleri | Bölüm 11 |
| `erisilebilirlik.md` | Site ve panel herkes tarafından kullanılabilir olmalı | Bölüm 11 |
| `formlar.md` | Bütün form alanları aynı yapıdan gelir | Bölüm 12 ve 14 |
| `yonetim-paneli.md` | Yönetim panelinin her sayfası aynı iskeletle kurulur | Bölüm 14 |
| `liste-motoru.md` | Ürün, sipariş, müşteri listeleri tek ortak liste yapısından gelir | Bölüm 14 |
| `test.md` | Hangi işler için otomatik test yazılır | Bölüm 5 ve 20 |
| `hata-izleme.md` | Hatalar nasıl yakalanır ve kaydedilir | Bölüm 21 |

Kural dosyalarının başındaki `paths` satırları Claude'a o dosyayı hangi klasörlerde çalışırken okuyacağını söyler.
Bu satırlar Bölüm 4'te, teknoloji kararından sonra projenin klasör düzenine göre güncellenir.
