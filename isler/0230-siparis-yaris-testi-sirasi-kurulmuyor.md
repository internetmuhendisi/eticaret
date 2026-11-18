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

## Durum

yapılacak
