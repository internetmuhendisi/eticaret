# 0226 · Kontrol hattında geliştirme sunucusunun istek satırları görünmüyor

## Amaç

Tarayıcı testlerinin kullandığı geliştirme sunucusu (`playwright.config.ts`, `webServer`) yalnız hata akışını hattın günlüğüne yazıyor. Next.js'in her istek için yazdığı satır (`POST /kapi/... 200 in 4905ms (next.js: …, application-code: …)`) görünmüyor. Kart 0207 ve 0222'de isteğin derlemeyi mi işi mi beklediği bu yüzden hattın günlüğünden okunamadı. Sebep tarayıcı izindeki "[Fast Refresh] rebuilding" satırından çıkarıldı. Kart 0222'nin bağımsız kontrolünde öneri olarak geldi, o karta karıştırılmadı.

## Olmazsa olmazlar

- Hatta sunucunun istek satırları da görünsün. Günlüğün büyüklüğü ölçülsün (bütün takım yerelde birkaç bin satır yazıyor). Gerekirse satırlar ayrı bir dosyaya yazılıp yalnız tarayıcı testleri kırmızıyken hattın sonucunda saklansın (karar 0131'deki iz gibi).
- Satırlarda gizli bilgi olmadığı ölçülsün: adresin sorgu kısmı, e-posta, anahtar.
- Kart 0222'nin ısınmasıyla ödeme ve stok bildirimi uçlarının testler sırasında derlenmediği (framework süresinin 1 ms'nin altında kaldığı) hattın günlüğünden bir kez okunsun.

## Sınırlar

- Testlerin kendisi ve ısınma değişmez.

## Bitti sayılır

- Kırmızı hatta sunucunun istek satırları okunabiliyor.
- Satırlarda gizli bilgi yok.
- `.claude/rules/test.md` nerede okunacağını söylüyor.

## Notlar

- Hattın ölçümü (45567962785, kayıt 549ebb2, 2026-11-25): tarayıcı testleri kırmızı bitti (1 düştü, kart 0307), sonuçta `sunucu/olusan/tarayici-sunucu-gunlugu.log` vardı (5125 satır, 599 KB) ve izin saatiyle eşlendi. Satırlarda sorgu değeri yok.
- Isınmadan sonra testler sırasında ödeme, sipariş ve stok bildirimi uçlarının (30 uç) `next.js` payı 0,9–1,4 ms; tek istisna `banka-hesabi-ekle` 10 ms. Kartın yazdığı "1 ms'nin altında" harfiyen tutmaz, değerler 1 ms civarındadır; derleme yüzlerce ms sürer, bu uçlar testler sırasında derlenmedi.
- Aynı hatta ısınmış sayfalar testler sırasında yeniden derlendi: 4089 isteğin 67'sinde `next.js` payı 300 ms'yi aştı (ör. `/yonetim/hesabim` 536 ms, `/yonetim/menuler` 561 ms); ısınmanın sonunda Turbopack derleme önbelleğini 36,7 sn diske yazdı. Kart 0251'in notlarında.

## Durum

bitti
