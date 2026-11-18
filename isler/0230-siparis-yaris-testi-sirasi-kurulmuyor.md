# 0230 · Sipariş yarış testinde kilidin sırası kurulmadan rakip başlıyor

## Amaç

Kart 0164'ün gönderimindeki kontrol hattı (çalışma 44273517233) birim testlerinde yalnız bir testte kırmızı bitti (3442 testten 1). Önceki üç hatta aynı test yeşildi; son gönderim yalnız tarayıcı testi dosyalarını değiştirmişti.

- **Düşen test:** `cekirdek/moduller/siparis/testler/servis.test.ts`, "açık duran ayırmanın arkasında bekleyen düşürme kilit kalkınca ayırmayı görür (sıra kurularak)" (kart 0214).
- **Hata:** `kilitBekleyeniGor` 20 saniyede kilit bekleyen sorgu görmedi.
- **Hattın günlüğü:** Yakalanmamış iki hata var:
  - `hatasi` içinde "Hata bekleniyordu": düşürme başarılı oldu.
  - `cakisma` / `stok-yetersiz`: ayırma, düşürmeden sonra stoğu bulamadı.

**Sebep (kod ve günlükle).** Test, ayıran işlemi (`stokAyir`, sonra `bekle`) ve düşüren işlemi (`stokDus`) art arda başlatıyor. Düşüreni başlatmadan önce ayıranın stok satırını kilitlediğini beklemiyor. Bu çalışmada düşüren önce davrandı: kilidi o aldı, ayırma henüz yokken stoğu düşürdü. Ayırma arkadan stok bulamadı, kilitte kimse beklemediği için `kilitBekleyeniGor` düştü. Testin adı "sıra kurularak" diyor ama sıra kurulmuyor.

Bu sıranın hatta nasıl tersine döndüğü ölçülmedi. Olası sebep veritabanı havuzunun bağlantı açma sırasıdır.

## Olmazsa olmazlar

- Önce yeniden üretilir: düşüren işlem, ayıranın kilidi almasından önce başlatılarak (ör. ayıran işleme yapay bir bekleme konarak) aynı iki hata görülür.
- Düzeltme testte yapılır: ayıran işlem `stokAyir` bittikten sonra bir söz verir, düşüren işlem ancak o sözden sonra başlar.
- `kilitBekleyeniGor` kullanan öteki yarış testleri (15 dosya) aynı eksik için taranır: rakip, ilk işlemin kilidi aldığı görülmeden mi başlatılıyor?

## Sınırlar

- Stok ayırma ve düşürmenin kuralları ve kilit sırası değişmez.

## Bitti sayılır

- Sebep yeniden üretilerek ölçüldü.
- Düzeltmeyle test, sırası bozulan koşulda art arda on kez yeşil; düzeltme geri alınınca kırmızı.
- Öteki yarış testlerinin taraması yazıldı; aynı eksik bulunanlar düzeltildi ya da kart olarak yazıldı.
- Kontrol hattı yeşil.

## Ölçüm ve düzeltme (2026-11-18)

**Sebep doğrulandı: rakip, ilk işlem kilidi almadan başlıyordu.**

- **Kendiliğinden üretildi.** Değişikliksiz test yerelde art arda on kez çalıştırıldı (yük ortalaması 18–20). İkisinde hattaki hata birebir görüldü: `kilitBekleyeniGor` süre aşımı, "Hata bekleniyordu" ve `cakisma` / `stok-yetersiz`.
- **Zorla üretildi.** Ayıran işleme `stokAyir`'den önce 1 saniyelik geçici bir bekleme konduğunda (kayda girmedi) düzeltmesiz test 3/3 kırmızı oldu, aynı üç hatayla.

**Düzeltme (yalnız testte).** Ayıran işlem `stokAyir` bitince bir söz verir. Test, düşüren işlemi `Promise.race([kilitli, ayiran])` beklendikten sonra başlatır; ayıran işlem düşerse hata da buradan çıkar. Aynı kalıbı galeri ve özellik testlerinin `acikIslem` yardımcısı zaten kullanıyor. Stok kuralları ve kilit sırası değişmedi.

- Geçici bekleme yerindeyken: düzeltmeyle 10/10 yeşil, düzeltmesiz 3/3 kırmızı.

**Tarama: `kilitBekleyeniGor` kullanan 15 test dosyası, 29 çağrı.** Her çağrının rakibi ilk işlemin kilidi aldığı görüldükten sonra mı başlıyor, ona bakıldı:

- **Aynı eksik, bu işte düzeltildi:**
  - `cekirdek/moduller/siparis/testler/servis.test.ts`, "açık duran siparişin arkasındaki sipariş stok satırının kilidinde bekler": ikinci sipariş, birincinin `for update`'inden önce başlayabiliyordu.
  - `cekirdek/moduller/tema/testler/tema-degisikligi.test.ts`, "tema değişikliği açık duran düzen işlemini bekler": `temayiYayinla`, açık işlemin düzen kilidinden önce başlayabiliyordu.
  
  İkisinde de ilk işleme 1 saniyelik geçici bekleme konunca düzeltmesiz 3/3 kırmızı, düzeltmeyle 10/10 yeşil.
- **Güvenli (26 çağrı):**
  - Rakip, ilk işlemin içinde kilidi alan satırdan sonra başlıyor: stok (2), ödeme servisi, favori, yorum.
  - Rakip, kilit alındıktan sonra verilen bir sözü bekliyor: ödeme yöntemleri, düzen (4) ve başlangıcı (2), menü (2) ve başlangıcı (2), vitrin bağlamı, varyant; galeri (3) ve özellik (5) `acikIslem` ile.
  - Düzen testinin ikinci `kilitBekleyeniGor(vt, 2)` çağrısı, ilk bekleyen görüldükten sonra başlıyor.

**Kontroller.**

- Geçici beklemeler kaldırıldıktan sonra iki dosya art arda 10/10 yeşil.
- İki dosya geçici bir ayarla tür denetiminden geçti (kart 0056); `pnpm tur-kontrolu` ve `pnpm denetim` temiz.

**Yazılı kural.** Yeni yarış testlerinin aynı eksiği taşımaması için kural `.claude/rules/test.md`'ye yazıldı. Kontrolü yoktur, yalnız disiplindir.

**Kalan madde.** "Kontrol hattı yeşil" maddesi gönderimde görülecek.

## Durum

bitti
