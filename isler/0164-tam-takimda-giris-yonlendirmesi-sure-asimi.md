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

## Durum

yapılacak
