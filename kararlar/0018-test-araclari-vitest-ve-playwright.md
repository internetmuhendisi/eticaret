# 0018 · Test araçları Vitest ve Playwright

## Tarih

2026-10-28

## Karar

- Birim ve entegrasyon testleri Vitest ile yazılır. Sürümü kökteki `package.json` dosyasında tam sürümle sabitlenir, şu an 5.0.5. Ayar kökteki `vitest.config.ts` dosyasındadır.
- Tarayıcıda tıklayarak deneyen testler Playwright ile yazılır. Sürümü şu an 1.64.1, ayar kökteki `playwright.config.ts` dosyasındadır. Şimdilik yalnız Chromium kullanılır.
- İki araç da yalnız `*.test.ts` ve `*.test.tsx` dosyalarını bulur. Tarayıcı testleri `uctan-uca/` klasörlerinde durur; Vitest bu klasörleri atlar, Playwright yalnız onları çalıştırır.
- Komutlar: `pnpm testler` (hepsi), `pnpm birim-testleri`, `pnpm tarayici-testleri`. Kırmızı test komutu başarısız bitirir.
- Kökteki ayar dosyaları ve `cekirdek/testler/` de tür kontrolüne girer (kökteki `tsconfig.json`, `pnpm tur-kontrolu`).

## Neden

- Vitest TypeScript dosyalarını ek dönüştürücü kurmadan çalıştırır, Node 24 ile uyumludur ve Next.js projelerinde yaygındır.
- Playwright sayfayı gerçek tarayıcıda açar ve kullanıcı gibi tıklar. Telefon, tablet ve dizüstü genişliklerinde ölçmeyi doğrudan destekler, bu ileride ekran ölçümü kontrolünde kullanılır (`.claude/rules/telefon-gorunumu.md`).
- İki aracın da ayarı küçüktür ve aynı dosya adlarıyla çalışır.

## Düşünülen diğer yollar

- Jest: Seçilmedi. TypeScript ve modern modül biçimi için ayrıca bir dönüştürücü ve ayar gerekir. Vitest'e göre yavaştır.
- Cypress: Seçilmedi. Tek sekmeyle sınırlıdır, Playwright'a göre yavaştır ve testleri ayrı bir çalışma biçimiyle yazdırır.
- Vitest'in kendi tarayıcı kipi: Seçilmedi. Bileşeni tarayıcıda dener, ama bütün bir akışı sayfa sayfa gezen testler için Playwright daha uygundur.

## Sonuçları

- Playwright, Chromium'u bilgisayarın ortak klasörüne (`~/.cache/ms-playwright`) bir kez indirir. Yeni bir bilgisayarda ve Docker kutusunda bir kez `pnpm exec playwright install chromium` çalıştırılmalıdır. Playwright sürümü yükseltilince bu komut tekrarlanır.
- Testlerin çıktı klasörleri (`test-results/`, `playwright-report/`) kayda girmez.
- Kök paket modern modül biçimindedir (`"type": "module"`). Kökteki `.js` dosyaları bu biçimde yazılır.
- Firefox ve Safari motoru (WebKit) gerekirse sonradan Playwright ayarına eklenir.
- Gerçek veritabanıyla çalışan testler veritabanı kurulunca yazılır (kart 0011, 0012).
