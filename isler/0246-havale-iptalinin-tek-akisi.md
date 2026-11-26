# 0246 · Süresi dolan havalenin iptalinin tek akışa alınması

## Amaç

Süresi dolan havalenin kendiliğinden iptali (`havaleIptalTaramasi`, `cekirdek/moduller/siparis/iptal.ts`) kendi stok geri koymasını yapar ve `siparis_iadeleri`'ne satır yazmaz. Kart 0235 iptal ve iadeyi tek akışa aldı (`iadeServisi`); "siparişin düşürüp geri konmamış adedini geri koy" kuralı bugün iki yerde yazılı (kart 0235'in bağımsız kontrolünün bulgusu).

Bölüm: Yönetim paneli 2 (açık kartlardan alındı). Kuponun iptal ve iadede geri hesabı tek akışa dayandığı için 0312'den önce yapılır.

## Olmazsa olmazlar

- Tarama iptali `iadeServisi` ile, sistem işlemi olarak yapar; geçmişin nedeni "havale-suresi-doldu" kalır.
- Taramanın bugünkü testleri (bildirimli sipariş, aynı anda iki tarama, hatada sonraki sipariş) yeşil kalır.

## Sınırlar

- Taramanın süresi ve kuralı değişmez.

## Bitti sayılır

- Stoğun geri konma kuralı tek yerde; testler gerçek veritabanıyla yeşil.

## Sonuç

- **Tek akış.** Süresi dolan havalenin iptali (`havaleIptalTaramasi`) artık `odemesiAlinmayaniIptalEt` ile (`cekirdek/moduller/siparis/iade.ts`) panelin ve müşterinin iptaliyle aynı tamamlama adımından (`tamamla`) geçer: sistemin iade satırı (kaynak "sistem", neden "odeme-alinmadi", tutar 0, bütün kalemler), stoğun yalnız siparişin düşürüp geri konmamış adedi kadar geri konması (tek kural: `geriKonabilir`), geçmiş ("havale-suresi-doldu" kaldı), e-posta, yönetici bildirimi ve değişiklik kaydı. Taramanın kendi stok işlevi silindi. Karar 0186 (karar 0147'nin "bu akışa girmez" maddesini değiştirir); değişiklik 0060 iki denetimi genişletir.
- **Döngüsel yükleme.** Tarama sipariş servisinden dışa verilmez (iade akışı ödeme eklentilerini, onlar sipariş servisini yükler); testler `iptal.ts`'ten alır. Arka plan sürecinin gerçek açılış testi yeşil.
- **Testler.** Taramanın üç testi (bir kez iptal ve aynı anda iki tarama, hatada sonraki sipariş, bildirimli sipariş) yeşil; ilkine iade satırı, değişiklik kaydı ve tek iptal e-postası eklendi. Kaynak ve neden denetimleri kayıtla aynı. Müşteriye kendiliğinden iptal yalnız geçmişin "ödeme süresi doldu" olayıyla görünür (`musteri.test.ts`). Sekiz denetim (eski yol, geçmiş nedeni, stoğa koyma, kaynak, kayıtta kaynak, kaynak listesi, değişiklik dosyası, müşteri süzgeci) ayrı ayrı bilerek bozularak denendi, her biri kırmızıya düştü.
- **Bağımsız kontrol.** Üç bulgu düzeltildi: müşterinin sipariş sayfasında iptalin iki kez görünmesi (sistemin iade satırı müşteriye gösterilmez; bu karttan önce iptal edilen siparişlerde iade satırı yoktur, geçmişin olayı ikisinde de yazar), kural dosyasındaki "yalnız iadeYap" maddesi, işlevin durumu kendisi denetlememesi.
- **Not.** Geniş takımda yerelde dört dosya paralel yük altında düştü, tek başına 30/30 yeşil; bu kartla ilgisiz.

## Durum

bitti
