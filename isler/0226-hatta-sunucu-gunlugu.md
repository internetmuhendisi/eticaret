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

## Durum

yapılacak
