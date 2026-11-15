# 0203 · Yavaş işlemcide yan pencere testi hatta süre sınırını aştı

## Amaç

Kart 0197'nin kapanış gönderiminde (2026-11-15, kayıt 01c76b5, hat çalışması 43690883075) kontrol hattında yalnız bir tarayıcı testi düştü:

- `cekirdek/testler/uctan-uca/katalog.test.ts:478` "yavaş işlemcide yan pencere sayfa hazır olunca açılır, konsolda uyuşmazlık uyarısı yok": `page.waitForLoadState: Test timeout of 60000ms exceeded.`

Test işlemciyi bilerek 4 kat yavaşlatır (kart 0121). Ana dalın bir önceki çalışmasında (d96af76, hat çalışması 43686874100) aynı test geçti. Hat yeniden çalıştırılmadı (her çalışma ücretli, kullanıcı kararı); düşüşün her seferinde mi, yükle mi olduğu bilinmiyor. Sebep ölçülmedi.

Bölüm: Testler.

## Olmazsa olmazlar

- Sebep ölçülerek bulunsun: testin hangi adımda beklediği (sayfanın açılması, menü düğmesi, `sayfaHazir`), hattaki makinenin hızında ve yükünde ne kadar sürdüğü. Tahmin düzeltilmesin.
- Ölçüm önce yerelde, hattın koşuluna yakın yükle yapılsın; hatta ölçüm gerekiyorsa çalıştırmadan önce kullanıcıya sorulsun.
- Testin yakaladığı kural (yavaş işlemcide sayfa bağlanmadan yan pencere açılınca uyuşmazlık uyarısı) zayıflamasın; düzeltme bozmayla gösterilsin.

## Sınırlar

- Süre sınırını yalnız yükseltmek düzeltme sayılmaz; gerekiyorsa ölçümle gerekçelendirilir.
- Yan pencerenin ve sayfa hazır beklemesinin davranışı, ölçüm hata göstermedikçe değişmez (kart 0121, karar 0099).

## Bitti sayılır

- Sebep ölçümle karta yazıldı.
- Düzeltmeden sonra test, hattın yüküne yakın yerel yükte art arda en az beş kez geçti.
- Hat yeşil.

## Ölçüm (2026-11-15)

- **Hattın kaydı (43690883075).** Test, sayfa açılışındaki ilk `sayfaHazir`'ın ilk adımında takıldı: `waitForLoadState("networkidle")`, 60 sn. Hatta testler tek işçiyle, sırayla çalışıyor. O dakikada başka test yoktu.
- **Yerelde hattın koşulu.** Ayrı kutuda temiz veritabanı, 2 işlemci (`taskset -c 0,1`), tek işçi. Testteki 4 kat yavaşlatmayla ağ 3/3 denemede 0,1 sn'de durdu. Hattın makinesi yaklaşık iki kat yavaş olduğu için 8 kat da ölçüldü. Bu ayarda 3/3 deneme 90 sn boyunca "ağ durdu" sinyalini almadı. Sayfa açıldıktan sonra hiç istek başlamamıştı. Tarayıcının kendi ağ kaydında (CDP) da bitmemiş istek yoktu. İç çerçeve yoktu, sayfa `complete` durumundaydı.
- **Playwright'ın iç durumu.** Takılan denemede açık istek yoktu, "ağ durdu" zamanlayıcısı kurulu değildi ve sinyal verilmemişti; Playwright artık hiçbir şeyi beklemiyordu. İşlevlere zaman damgalı kayıt eklendi; takılan üç denemenin üçünde de sıra aynıydı:
  1. Sayfanın dosyaları indi ve sinyal `domcontentloaded`'dan önce verildi.
  2. Geliştirme sunucusunun `hmr-client` isteği başlayıp bitti. Zamanlayıcı kurulmadı, çünkü Playwright'ın `_startNetworkIdleTimer`'ı "sinyal zaten verildi" diye erken dönüyor.
  3. Geç gelen `domcontentloaded` sinyali sildi (`removelifecycle networkidle`).

  Geçen denemelerde `hmr-client` sinyalden önce bitiyordu. Protokol kaydı açıkken (`DEBUG=pw:protocol`) zamanlama değiştiği için 10/10 deneme geçti.
- **Sürümler.** Aynı kod Playwright 1.65.1'de ve 2026-11-15 tarihli 1.66 ön sürümünde de var.
- **Düzeltme (karar 0130).** Playwright'a tek satırlık pnpm yaması uygulandı: zamanlayıcı sinyal verilmiş olsa da kurulur. Ortak `sayfaHazir` ve test değişmedi.
- **Karşılaştırma.** Ölçüm dosyası 8 kat yavaşlatma ve 2 işlemciyle, yamasız ve yamalı dönüşümlü çalıştırıldı:
  - Yamasızken toplam 43 denemenin 11'i takıldı. Turlara göre: 3/3, 2/2, 1/2, 3/12, 0/12, 2/12.
  - Yamalıyken 36 denemenin hiçbiri takılmadı (12, 12, 12).
  - Takılma rastlantıya bağlıdır. Testin kendisi 8 kat yavaşlatmayla yamasız da 10/10 geçti.
  - Kanıt, takılan her denemede kaydedilen sıradır; yama bu sırayı kıran satırı değiştirir. Oranlar düşük olduğu için 36'da 0 sonucu kesin kanıt değildir.
- **Yamanın denetimi.** `cekirdek/testler/playwright-yamasi.test.ts`, testlerin kullandığı Playwright'ta yarışlı satırın olmadığını ve sürümün yama kaydıyla aynı olduğunu ölçer. Kurulu kopyada yama geri alınınca kırmızıya düştü.
- **Doğrulama (2 işlemci, tek işçi).** Test 4 kat yavaşlatmayla (testin kendi ayarı) art arda 10 kez geçti (10/10). Bu ayarda bu bilgisayarda yamasız da takılmıyordu, yani tek başına yamayı kanıtlamaz. Katalog dosyası 72/72, bütün tarayıcı takımı 257/257 geçti; tema aşaması da çalıştı.
- **Bağımsız kontrolün bulgusu.** Yama kaydı `pnpm-workspace.yaml`'a girince çekirdeğin Docker görüntüsünün kurulumu yama dosyasını bulamadı ve durdu (`ERR_PNPM_PATCH_NOT_FOUND`, ölçüldü). Hat bu yüzden kırmızıya düşecekti. Düzeltmeler:
  - Yama klasörü Türkçe adla `yamalar/` oldu ve klasör ağacına yazıldı.
  - Görüntü klasörü içeri alıyor (`Dockerfile.dockerignore`, `COPY yamalar/`).
  - Yamanın içindeki not altyapının adını taşımıyor.
  - Koruma testi işlev gövdesinin sonu bulunamazsa hata veriyor.

  Görüntü derlendi, görüntü denetimi geçti. Yerel ortam denemesi kutuları sabit adla bulduğu için asıl yerel ortama karışmasın diye çalıştırılmadı; hatta çalışır.
- **Testin kuralı.** Test sayfa hazır beklemesi olmadan menüyü açınca 3/3 denemede konsoldaki uyuşmazlık uyarısıyla (`aria-hidden`) kırmızıya düştü (518. satır).

## Durum

yapılacak
