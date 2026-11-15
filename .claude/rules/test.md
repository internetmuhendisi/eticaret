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
- Playwright yamalıdır (karar 0130): "networkidle" sinyali yavaş işlemcide bir daha gelmeyebiliyordu. Playwright yükseltilirken yama yeniden uygulanır ya da yarışın düzeldiği ölçülür; `cekirdek/testler/playwright-yamasi.test.ts` yamanın durduğunu denetler.
- Konsolu denetleyen tarayıcı testi `konsoluDinle` kullanır (`cekirdek/testler/uctan-uca/konsol.ts`, kart 0123): hatalar, yakalanmamış hatalar ve hangi seviyede yazılırsa yazılsın hidrasyon uyarısı sayılır; beklenen hata (ör. girişsiz oturum sorusunun 401'i) `haric` ile ayıklanır, hidrasyon uyarısı ayıklanamaz.
- Vitrinin her sayfa türü ekran ölçümünden (`ekran-olcumu.test.ts`: dört genişlik, iki tema, yana kayma, konsol, tarama, basılan alan) ve hız ölçümünden (`pnpm hiz-olcumu`, `cekirdek/testler/hiz/`, karar 0124) geçer. Basılan alan `basilan-alan.ts` ile ölçülür. Hız ölçümü Vitest'te ve tarayıcı testlerinde çalışmaz, kendi Playwright ayarıyla (`playwright.hiz.config.ts`) çalışır.
- Bütün vitrinin görünüşünü değiştiren tarayıcı testi (tema değişikliği) öteki tarayıcı testleri bittikten sonra kendi aşamasında çalışır (`playwright.config.ts`, `tema-degisikligi`, karar 0129) ve sonunda değiştirdiğini geri alır. Yalnız onu çalıştırmak: `pnpm tarayici-testleri <dosya> --no-deps`.
- Ekran bileşeninin testi dosyanın başına `// @vitest-environment jsdom` yazar ve Testing Library ile çizer (karar 0025). Sunucuda çizimi `react-dom/server` ile denenir.
