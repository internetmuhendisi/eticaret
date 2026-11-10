---
paths:
  - "**/*.test.*"
  - "**/testler/**"
  - "**/playwright.config.*"
  - "**/vitest.config.*"
---

# Test

Birim testi tek bir parçayı, entegrasyon testi parçaların birlikte çalışmasını otomatik olarak dener.

- Giriş, yetki, site verisi ayrımı, fiyat hesabı, ödeme, sipariş ve stok için otomatik test yaz.
- Yazılan her test yayın kontrolünde çalışsın. Kırmızı test yayını durdurur.
- Veri ayrımı ve yetki testlerini taklit değil gerçek veritabanıyla yap.
- Her test kendi verisini hazırlasın ve başka teste bağlı olmasın.
- Önemli akışları tarayıcıda gerçek kullanıcı gibi tıklayarak dene.
- Bir işin bitip bitmediğini işi yapmayan ikinci bir kontrol onaylasın. İşi yapan kendi işini onaylamaz.

## Araçlar ve komutlar (karar 0018)

- Birim ve entegrasyon testleri Vitest ile, tarayıcı testleri Playwright ile yazılır.
- Test dosyasının adı `*.test.ts` ya da `*.test.tsx` ile biter. Tarayıcı testleri `uctan-uca/` klasöründe durur, öteki testler orada durmaz.
- `pnpm testler` bütün testleri çalıştırır. Tek aracı çalıştırmak için `pnpm birim-testleri` ya da `pnpm tarayici-testleri`.
- Test dosyaları da tür kontrolünden geçer (`pnpm tur-kontrolu`).
- Tarayıcı testi sayfayla etkileşmeden önce `sayfaHazir` ile bekler (`cekirdek/testler/uctan-uca/sayfa-hazir.ts`, karar 0099): yalnız ağ işini beklemek sayfanın tarayıcıda bağlandığını göstermez.
- Ekran bileşeninin testi dosyanın başına `// @vitest-environment jsdom` yazar ve Testing Library ile çizer (karar 0025). Sunucuda çizimi `react-dom/server` ile denenir.
