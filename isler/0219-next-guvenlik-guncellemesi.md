# 0219 · Next.js güvenlik güncellemesi

## Amaç

Kart 0218 sırasında (2026-11-17) `pnpm guvenlik-taramasi` kırmızı çıktı: kullanılan Next.js 16.4.3'te orta düzeyde bilinen bir açık var (GHSA-mfr8-8qww-v76h, etkilenen 16.3.0–16.4.4, düzeltilmiş 16.4.5 ve sonrası). `next build` de aynı gerekçeyle durur (`SecurityFatalError`, "yeniden çalıştırın" der): yerelde hız ölçümünün dört derlemesinden ikisi böyle düştü, aradaki ikisi derledi; hattın temiz makinesinde her derlemede düşebilir. Tarayıcı testlerinin geliştirme sunucusu (`next dev`) da aynı uyarıyla bir kez açılmadı. Tarama kontrol hattında testlerden önce çalıştığı için bu düzelmeden hat yeşil olmaz, yayın yapılamaz.

## Olmazsa olmazlar

- Next.js çekirdekte ve kökte düzeltilmiş sürüme yükseltilir; kilit dosyası güncellenir.
- Açığın ne olduğu ve bizi etkileyip etkilemediği okunur, karar kaydına ya da sürüm notuna yazılır.
- Next.js 16'ya bağlı bilinen davranışlar yeniden ölçülür (karar 0104'teki `notFound()` çizimi, karar 0130'daki Playwright yaması değil ama tarayıcı testlerinin tamamı).

## Sınırlar

- Başka paket yükseltmesi bu kartın işi değildir.

## Bitti sayılır

- `pnpm guvenlik-taramasi` yeşil.
- Tür kontrolü, birim ve tarayıcı testleri, hız ölçümü yeşil; kontrol hattı yeşil.

## Durum

bitti
