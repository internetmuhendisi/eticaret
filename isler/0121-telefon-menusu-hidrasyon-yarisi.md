# 0121 · Telefon menüsü testinde hidrasyon yarışı

## Amaç

Kart 0110'un bütün tarayıcı testleri çalışırken "üst kısım: telefonda menü yan pencereden açılır" testi bir kez kırmızıya düştü (2026-11-09).

- Konsolda React'ın hidrasyon uyuşmazlığı uyarısı vardı. Sunucunun çizdiği HTML'de olmayan `aria-hidden` ve `data-aria-hidden` öznitelikleri, katalogdaki ana sayfa bölümlerinin kabındaydı.
- Yan pencere (Radix) açılınca sayfanın geri kalanını ekran okuyucudan gizler. Bunu yaparken henüz hidrasyonu bitmemiş bölümlere öznitelik yazıyor gibi görünüyor. Bu bir tahmindir, ölçülmedi.
- Test tek başına sekiz kez art arda geçti. Kırmızı yalnız bütün takım çalışırken, geliştirme sunucusu sayfayı derlerken görüldü.
- Kart 0110 bölüm kütüphanesi sayfasını ağırlaştırdı. Bu da yarışı daha olası kılmış olabilir.

Uyarıyı React yalnız geliştirme derlemesinde yazar. Kırmızı test ise kontrol hattını durdurabilir.

## Ölçüm (2026-11-10, kart 0131 sırasında)

- Uyuşmazlık vitrinin gerçek ana sayfasında da çıktı. Telefon genişliğinde (360 px) sayfa yeniden yüklendi, ağ işinin bitmesi beklendi, sonra menü düğmesine basıldı. React, ana sayfa bölümlerinin `section` öğelerinde sunucunun HTML'inde olmayan `aria-hidden` ve `data-aria-hidden` uyarısını verdi: güven şeridi, kampanya afişleri, kategori kutuları, ürün vitrinleri. Ağ işinin bitmesi hidrasyonun bittiğini göstermiyor: üst kısımdaki menü düğmesi bağlanmış, ana sayfa bölümleri henüz bağlanmamıştı.
- Kontrol hattında (kart 0114'ün çalışması, 42766203129) aynı uyarı bileşen kataloğunun bölüm kütüphanesi sayfasında `katalog.test.ts`'in iki testini düşürdü; üçüncü test aynı sayfada odak bekledi.

## Olmazsa olmazlar

- Önce ölçülür: uyuşmazlık hidrasyon bitmeden pencere açılınca mı oluyor? Canlı derlemede de oluyor mu? Pencere kapanınca öznitelik kalıyor mu?
- Vitrinin gerçek sayfasında da aynı durum denenir: ağır bir ana sayfada, hidrasyondan önce menü düğmesine basmak.
- Çözüm testi zayıflatmaz. Konsol hatası denetimi kalır; gerekiyorsa test sayfanın hazır olmasını ölçerek bekler.

## Sınırlar

- Yan pencere parçasının davranışı (dışarının inert olması) değiştirilmez, ancak ölçüm gerektirirse ayrı bir kararla değişir.

## Bitti sayılır

- Nedeni ölçümle bulundu ve karta yazıldı.
- Test bütün takım içinde art arda en az beş kez geçiyor.

## Durum

yapılacak
