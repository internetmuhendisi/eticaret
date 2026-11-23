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
- Sırayı kuran yarış testinde (`kilitBekleyeniGor`) rakip, ilk işlem kilidi aldıktan sonra başlatılır. İlk işlem kilidi alınca bir söz verir, test o sözü (`Promise.race` ile işlemle birlikte) bekleyip sonra rakibi başlatır (kart 0230). Art arda başlatılan iki işlemde rakip kilidi önce alabilir. Yalnız disiplindir.
- Önemli akışları tarayıcıda gerçek kullanıcı gibi tıklayarak dene.
- Bir işin bitip bitmediğini işi yapmayan ikinci bir kontrol onaylasın. İşi yapan kendi işini onaylamaz.

## Araçlar ve komutlar (karar 0018)

- Birim ve entegrasyon testleri Vitest ile, tarayıcı testleri Playwright ile yazılır.
- Test dosyasının adı `*.test.ts` ya da `*.test.tsx` ile biter. Tarayıcı testleri `uctan-uca/` klasöründe durur, öteki testler orada durmaz.
- `pnpm testler` bütün testleri çalıştırır. Tek aracı çalıştırmak için `pnpm birim-testleri` ya da `pnpm tarayici-testleri`.
- Test dosyaları da tür kontrolünden geçer (`pnpm tur-kontrolu`).
- Tarayıcı testlerinden önce, kurulumdan (`hazirlik.ts`) sonra ikinci hazırlık uygulamanın her yolunu bir kez ister (`cekirdek/testler/uctan-uca/isinma.ts`, kart 0222): geliştirme sunucusu yolu ilk istekte derler, hatta bu derleme takımın ortasında 5 saniyelik beklemeyi aştı. Yollar uygulamanın klasöründen okunur. Ardından sayfalar gerçek tarayıcıda iki tur açılır (kart 0164): girişsiz sayfalar, sonra deneme yöneticisiyle kurulum, panelin her sayfası ve giriş kodu; sonradan derlenen sayfa öncekileri de yeniden derlettiği için tur iki kezdir. Isınma hız ölçümünde yoktur: hız ölçümü `hazirlik.ts`'yi kullanır, ısınmayı oraya koymak ölçümü düşürdü (hat 44220561276); `cekirdek/testler/isinma.test.ts` ikisinin yerini denetler.
- Bildirim gösteren bir işlemden kısa süre sonra tarayan test, taramadan önce `bildirimSuresiniDurdur` çağırır (`cekirdek/testler/uctan-uca/bildirim-suresi.ts`, kart 0220): bildirimin süresi tarama sürerken dolarsa kapanma geçişi kontrastı düşürür, animasyon beklemesi bunu göremez.
- Tarayıcı testi sayfayla etkileşmeden önce `sayfaHazir` ile bekler (`cekirdek/testler/uctan-uca/sayfa-hazir.ts`, karar 0099): yalnız ağ işini beklemek sayfanın tarayıcıda bağlandığını göstermez. Tam sayfa yüklemesiyle biten yardımcı (`paneleGir`) da sonunda bekler: bağlanmamış sayfada başlayan geçiş, gövdeye akan önceki sayfanın `<title>`'ını React'a bağlanmamış bırakabiliyor (kart 0252). Bekleme ağ işinden sonra en çok 30 saniye sürer, dolunca bağlanmamış öğeleri adıyla söyler (`sayfa-hazir.test.ts`).
- Düşen tarayıcı testinin izi (adımların zamanı, ağ istekleri, görüntüler) `test-results/` altında kalır, kontrol hattı onu 14 gün saklar (karar 0131). Hatta ara sıra düşen testin sebebi önce bu izden okunur; `pnpm exec playwright show-trace <dosya>` ile açılır.
- Playwright yamalıdır (karar 0130): "networkidle" sinyali yavaş işlemcide bir daha gelmeyebiliyordu. Playwright yükseltilirken yama yeniden uygulanır ya da yarışın düzeldiği ölçülür; `cekirdek/testler/playwright-yamasi.test.ts` yamanın durduğunu denetler.
- Konsolu denetleyen tarayıcı testi `konsoluDinle` kullanır (`cekirdek/testler/uctan-uca/konsol.ts`, kart 0123): hatalar, yakalanmamış hatalar ve hangi seviyede yazılırsa yazılsın hidrasyon uyarısı sayılır; beklenen hata (ör. girişsiz oturum sorusunun 401'i) `haric` ile ayıklanır, hidrasyon uyarısı ayıklanamaz.
- Vitrinin her sayfa türü ekran ölçümünden (`ekran-olcumu.test.ts`: dört genişlik, iki tema, yana kayma, konsol, tarama, basılan alan) ve hız ölçümünden (`pnpm hiz-olcumu`, `cekirdek/testler/hiz/`, karar 0124) geçer. Basılan alan `basilan-alan.ts` ile ölçülür. Hız ölçümü Vitest'te ve tarayıcı testlerinde çalışmaz, kendi Playwright ayarıyla (`playwright.hiz.config.ts`) çalışır.
- Tarayıcı testleri hatta iki işçiyle paralel çalışır, sitenin vitrin düzeni paylaşılır. Düzeni değiştiren tarayıcı testi (bölüm ekler, siler, sıralar, gizler) testin başında `duzenKilidiniAl` ile kilidi alır, sonunda bırakır (`cekirdek/testler/uctan-uca/duzen-kilidi.ts`, kart 0293); kilidi beklemek testin süresinden düşmez. Kilidi almamak yalnız disiplindir.
- Klavyeyle seçim yapıp hemen odağı başka yere taşıyan test, biçimli metin alanında seçimin editöre geçmesini bekler (kart 0293): editör tarayıcının seçim olayını geç okur.
- Bütün vitrinin görünüşünü değiştiren tarayıcı testi (tema değişikliği) öteki tarayıcı testleri bittikten sonra kendi aşamasında çalışır (`playwright.config.ts`, `tema-degisikligi`, karar 0129) ve sonunda değiştirdiğini geri alır. Yalnız onu çalıştırmak: `pnpm tarayici-testleri <dosya> --no-deps`.
- Ekran bileşeninin testi dosyanın başına `// @vitest-environment jsdom` yazar ve Testing Library ile çizer (karar 0025). Sunucuda çizimi `react-dom/server` ile denenir.
