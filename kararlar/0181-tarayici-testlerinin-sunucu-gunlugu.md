# 0181 · Tarayıcı testlerinin sunucu günlüğü ayrı dosyada, düşen testin iziyle saklanır

## Tarih

2026-11-25

## Karar

Tarayıcı testlerinin geliştirme sunucusu, istek satırlarını hattın günlüğüne değil kayıt dışı bir dosyaya yazar (`sunucu/olusan/tarayici-sunucu-gunlugu.log`, `komutlar/sunucu-gunlugu.mts`). Next.js her istek için bir satır yazar, satır isteğin süresini derleme payı (`next.js`) ve işin payı (`application-code`) olarak ayırır. Dosyada her satır yazıldığı anla (Unix saniyesi) başlar, adreslerin sorgu kısmında yalnız adlar kalır, değerler silinir. Kontrol hattı dosyayı, tarayıcı testleri kırmızı bitince düşen testlerin iziyle aynı sonuçta 14 gün saklar (karar 0131). Sunucunun hata akışı eskisi gibi hattın günlüğünde görünür.

## Neden

Kart 0207, 0222 ve 0251'de hatta bir istek 4–5 saniye bekledi. Beklemenin derlemeden mi işten mi geldiği hattın günlüğünden okunamadı, tarayıcı izindeki "[Fast Refresh] rebuilding" satırından tahmin edildi. Kart 0251'de düşüş yerelde hattın koşuluyla üretilemedi: temiz veritabanıyla iki tam takımda (dolu ve boş derleme önbelleği) bu aileden düşüş olmadı. Sebep ancak hattın kendi sunucusunun satırlarıyla görülebilir.

Satırın anı izdeki saatle eşlenir: izin `context-options` olayının duvar saati ve tekdüze saati, izdeki her isteği sunucunun satırına bağlar.

## Düşünülen diğer yollar

- **Satırları hattın günlüğüne yazmak (`stdout: "pipe"`).** Bütün takım yaklaşık 5 bin satır, 1 MB yazar (kart 0251'de ölçüldü). Kırmızı testin hata iletisi bunların arasında kaybolur; geçen hatta da günlük şişer.
- **Dosyayı her hatta saklamak.** Yeşil hatta okunmaz, sonuç yer kaplar (karar 0131'deki iz gibi).
- **Dosyayı `test-results/` içine yazmak.** Playwright o klasörü çalışmanın başında temizler; sunucu temizlikten önce açılırsa satırlar silinir.
- **Sorgu kısmını olduğu gibi bırakmak.** Hatta gerçek gizli bilgi yoktur (karar 0029), ama aranan metin, kimlik ve dönüş adresi düşüşü anlamak için gerekmez; adlar hangi isteğin olduğunu söylemeye yeter.

## Sonuçları

- Sunucu `pnpm cekirdek | node komutlar/sunucu-gunlugu.mts` ile açılır. Betik dosyayı açamazsa hata koduyla biter, sunucunun çıkışı kırılır ve Playwright sunucunun açılmadığını söyler.
- Yerelde de dosya her tarayıcı testi çalışmasında baştan yazılır. Açık bir sunucu yeniden kullanılırsa (`reuseExistingServer`) dosya yazılmaz.
- Uygulamanın kendi günlüğü (JSON satırları) da dosyaya gider; e-posta orada zaten kısaltılmıştır, şifre ve anahtar yazılmaz (kart 0014). Kart 0226'da bir tam takımın ve elle sipariş testinin satırlarında açık e-posta ve sorgu değeri olmadığı bir kez ölçüldü; sürekli denetimi yalnız betiğin birim testidir.
- Hız ölçümü bu betiği kullanmaz: kendi sunucusu canlıdaki gibi derlenmiştir.
