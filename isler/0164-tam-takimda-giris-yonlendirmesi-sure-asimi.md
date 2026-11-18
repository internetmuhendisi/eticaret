# 0164 · Tam takımda giriş ve şifre sıfırlama yönlendirmesi 5 saniyeyi aşıyor

## Amaç

Kart 0142'nin kapanış kontrolünde bütün tarayıcı testleri bir kez çalıştı (206 test, yerel geliştirme sunucusu, yük ortalaması yaklaşık 19–21). Sekiz test düştü. Biri kart 0142'nin kendi testiydi: tek uzun test süre sınırını aştı, test bölündü.

Öteki yedisinin dosyaları (52 test) hemen ardından aynı yükte tek başına çalıştı ve hepsi geçti. Bunların üçü bilinen süre aşımlarıdır: arama ve durum sayfaları taraması (kart 0157), favoriler sayfası (`networkidle`, kart 0152 ile aynı ileti).

Kalan dördünün kartı yok:
- `yonetici-girisi.test.ts` "giriş yapıp boş panele ulaşır" ve "girişten sonra istenen sayfaya döner"
- `panel-cercevesi.test.ts` "iki renkte ve üç genişlikte"

Bu üç testte şifreyle girişten sonra sayfa 5 saniyede `/yonetim/giris/kurulum`'a gitmedi, `/yonetim/giris`'te kaldı (`yonetici.ts:43`). Dördüncüsü `sifre-sifirlama.test.ts` "sayfa yenilenince bağlantı geçerli kalır": kayıttan sonra ana sayfaya yönlenme 5 saniyede görülmedi, sayfa `/kayit`'ta kaldı.

Kart 0219'un yerel hat denemesinde (2026-11-17, temiz veritabanı, dört işlemci, iki işçi) bir kez daha görüldü: `yorumlar.test.ts` "girişsiz müşteri girişe gider, ürüne döner…", müşteri girişinden ürüne dönüşten sonra `sayfaHazir` 60 saniyede bitmedi. Dosya tek başına 12 denemede geçti, tam takım aynı koşulda bir kez daha çalıştı ve 266 testin hepsi geçti.

Kart 0142 tarayıcı takımına sekiz giriş yapan test ekledi; aynı anda giden giriş isteği sayısı arttı. Nedenin yük mü, istek sınırı mı (her test rastgele bir IPv4 adresinden gelir, `ayriBaglanti`) olduğu ölçülmedi.

## Olmazsa olmazlar

- Önce yeniden üretilir: tam takım yükte birkaç kez çalıştırılır. Düşen istekte giriş ucunun yanıtı (durum kodu, `Retry-After`, süre) kaydedilir.
- Neden istek sınırıysa testlerin bağlantı adresi çakışmayacak biçimde verilir. Yükse bekleme sınırı ölçüye dayanarak ayarlanır.

## Sınırlar

- Giriş ucunun ve istek sınırının kuralları değişmez.

## Bitti sayılır

- Neden ölçülüp karta yazıldı.
- Tam takım yükte art arda en az üç kez bu dört test düşmeden geçiyor.

## Ölçüm ve düzeltme (2026-11-18)

**Sebep: geliştirme sunucusunun ilk derlemesi** (kart 0222 ile aynı mekanizma). Ne yük ne istek sınırı.

- **Hattın izi (44244153259, `menuler.test.ts:114`).** "Giriş yap"a basıldıktan 0,65 sn sonra tarayıcıda `[Fast Refresh] rebuilding`, ardından `done in 4476ms` görüldü. Kurulum sayfasının isteği (`/yonetim/giris/kurulum`) derleme bitene kadar bekledi; `yonetici.ts:43`'teki 5 saniyelik beklenti düştü. Giriş ucunun yanıtı 200'dü, istek sınırı değildi.
- **Neden ısınma yetmedi?** Kart 0222'nin ısınması yolları fetch ile istiyordu. Girişsiz istekte girişe yönlenen sayfalar ise derlenmiyordu: panel sayfaları, giriş kodu ve kurulum. 0222'nin ısınmalı yerel takımında testler sırasında bu sayfaların derleme payı şöyleydi: kurulum 859 ms, giriş kodu 417 ms, panel sayfaları 492–995 ms.

**Düzeltme.** Isınmaya tarayıcı turu eklendi (`cekirdek/testler/uctan-uca/isinma.ts`):
- Girişsiz sayfalar gerçek tarayıcıda açılır.
- Deneme yöneticisiyle şifre ve iki aşamalı kurulumdan geçilir (kurulum sayfası) ve panelin her sayfası açılır.
- Kurulumu bitmiş hesapla yeniden girilir (giriş kodu sayfası).
- Testlerin giriş yardımcıları kullanılır: `paneleGir` ve `kurulumuBitir` isteğe bağlı bekleme süresi alır, testlerin davranışı değişmez.

**Tur iki kez yapılır.** Boş önbellekle tek turdan sonra ilk test kurulum sayfasında 967 ms, menüler sayfasında 837 ms derleme bekledi. İki turdan sonra bu süreler 6 ve 10 ms oldu (birer deneme). Sebebin, sonradan derlenen sayfaların öncekileri yeniden derletmesi olduğu tahmindir, ölçülmedi. Hattaki düşüş de buna uyuyor: menüler testi 139. sıradaydı ve kurulum sayfası önceki testlerde zaten açılmıştı.

**Üç tam takım** (temiz veritabanı, boş önbellek, iki işlemci, tek işçi). Testler sırasında en uzun derleme payı:

| Sayfa | Önce (yalnız fetch ısınması) | 1. çalışma | 2. çalışma | 3. çalışma |
|---|---|---|---|---|
| Kurulum | 859 ms | 44 ms | 229 ms | 115 ms |
| Giriş kodu | 417 ms | 29 ms | 170 ms | 179 ms |
| Panel sayfaları | 492–995 ms | 38–130 ms | 145–397 ms | 84–224 ms |

Üçüncü çalışmada vitrin bölümleri sayfası bir kez 760 ms aldı.

- **Kartın dört testi ve hattı düşüren menüler testi:** üç çalışmanın üçünde geçti.
- **Bütün takım:** birinci çalışmada 286/286. İkinci ve üçüncüde birer başka test (`katalog.test.ts:65`, `vitrin-bolumleri.test.ts:534`) `net::ERR_NETWORK_CHANGED` ile düştü. Tarayıcı, bu bilgisayarda Docker ağları değişince isteği kesiyor; yerel ortama ait, hatta görülmedi.

**Bağımsız kontrolün bulgularıyla düzelenler.**
- Her tur kendi istemci adresinden gelir. Giriş ucu dakikada beş istekle sınırlı; iki turun dört girişi tek adresin payını neredeyse dolduruyordu.
- Düşen tur bir kez yeniden denenir. Isınmadaki tek bir ağ hatası bütün takımı düşürüyordu.
- Her adımın tarayıcı bağlamı işi bitince kapanır.
- Birim testi her sayfa dosyasının tam bir gruba düştüğünü ve giriş kodu ile kurulum sayfalarının var olduğunu denetler. Ad değişince kırmızı; ölçüldü.

Bu değişikliklerden sonra dördüncü bir tam takım aynı koşulda çalıştırıldı.
- Sonuç: 286/286; kartın dört testi ve menüler testi geçti.
- Testler sırasında en uzun derleme payı: kurulum 265 ms, giriş kodu 139 ms, menüler 338 ms, vitrin bölümleri 696 ms.

Bütün birim takımı 3441/3441 (tarayıcı turu eklendikten sonra). Hız ölçümü bu değişikliği kullanmıyor: hız ayarı ne ısınmayı ne giriş yardımcısını içe aktarıyor.

**Bilinen sınırlar.**
- Tarayıcı turunun gerçekten giriş yapıp sayfaları derlediği birim testinde değil, tam takım ölçümündedir.
- Isınmanın hattaki süresi henüz ölçülmedi (yerelde istek süreleri toplamı 63–171 sn).

## Durum

bitti
