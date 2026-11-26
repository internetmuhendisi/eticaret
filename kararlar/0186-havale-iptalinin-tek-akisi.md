# 0186 · Süresi dolan havalenin iptali iptalin tek akışından geçer

## Tarih

2026-11-26

## Karar

Süresinde ödenmeyen havale siparişinin kendiliğinden iptali (`havaleIptalTaramasi`) panelin ve müşterinin iptaliyle aynı akıştan geçer (`odemesiAlinmayaniIptalEt`, `cekirdek/moduller/siparis/iade.ts`): sistemin iade satırı yazılır (kaynak "sistem", neden "odeme-alinmadi", tutar 0), stok yalnız siparişin düşürüp geri konmamış adedi kadar geri konur, geçmişin nedeni "havale-suresi-doldu" kalır, değişiklik kaydı yazılır. Karar 0147'nin "kendiliğinden iptal bu akışa girmez, kendi stok geri koymasını yapar" maddesi bununla değişir; karar 0147'nin öteki maddeleri geçerlidir. Kart 0246.

## Neden

- "Siparişin düşürdüğü adedi geri koy" kuralı iki yerde yazılıydı; tarama yalnız düşürme satırlarını sayıyordu, iade akışı geri konanları da düşüyordu. İki kural ayrışabilirdi.
- Kupon kartı (0312) iptal ve iadede indirimin ve kullanım hakkının geri hesabını tek akışa bağlayacak (karar 0185); kendiliğinden iptal de o akıştan geçmeli.
- Her iptal iade tablosunda görünür: panelin ve müşterinin sipariş sayfası, raporlar aynı satırdan okur.

## Düşünülen diğer yollar

- Yalnız stok kuralını ortak bir işleve almak: iki akış yine ayrı kalırdı, kuponun geri hesabı iki yerde yazılırdı.
- Taramanın `iadeYap`'ı çağırması: o işlev panelin girdisini (görülen durum, numara, tutar yazısı) ve kendi işlemini ister, taramanın satır kilidi ve "SKIP LOCKED" kuralı dışarıda kalırdı. Ortak parça tamamlama adımıdır (`tamamla`), iki giriş ondan geçer.
- Sistem iptali için yeni bir neden yerine "diger": panelde iadenin nedeni "Diğer" görünürdü, yanıltıcı.

## Sonuçları

- İade tablosunun kaynak ve neden denetimleri genişledi (değişiklik 0060); "odeme-alinmadi" panelde seçilmez (`sistemIadeNedenleri`).
- Tarama artık sipariş servisinden dışa verilmez: iade akışı ödeme eklentilerini, onlar sipariş servisini yüklüyordu (döngüsel yükleme). Testler taramayı `iptal.ts`'ten alır.
- Kendiliğinden iptal artık değişiklik kaydına girer (sistemin adıyla).
