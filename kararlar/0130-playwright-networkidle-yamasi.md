# 0130 · Playwright'ın "networkidle" yarışına yama

## Tarih

2026-11-15

## Karar

Testlerin kullandığı `playwright-core` pnpm'in yama düzeniyle yamalanır (`yamalar/playwright-core@1.64.1.patch`, `pnpm-workspace.yaml` → `patchedDependencies`). Yama tek satırlıktır: "ağ durdu" (`networkidle`) zamanlayıcısı, sinyal daha önce verilmiş olsa da kurulur.

Testlerin ortak "sayfa hazır" beklemesi (`sayfaHazir`, karar 0099) değişmez. `cekirdek/testler/playwright-yamasi.test.ts` iki şeyi ölçer: testlerin kullandığı Playwright'ta yarışlı satırın olmadığını ve kurulu sürümün yama kaydıyla aynı olduğunu.

## Neden

Kart 0203'te ölçüldü. İşlemci çok yavaşken sayfanın bütün dosyaları, sayfa kodu çalışmadan iner. Bu durumda Playwright "ağ durdu" sinyalini `domcontentloaded`'dan önce verir. Ardından geliştirme sunucusunun canlı yenileme kodu (`hmr-client`) için küçük bir istek başlayıp biter. Yamasız Playwright'ta iki şey birden olur:

- İstek başlayınca sayfanın kendi "durdu" bilgisi silinir.
- İstek bitince zamanlayıcı kurulmaz, çünkü sinyal zaten verilmiştir.

Sonra gelen `domcontentloaded` olayı sinyali yeniden hesaplar ve siler. Artık ne açık istek ne zamanlayıcı vardır, sinyal bir daha hiç gelmez. Test 60 saniye bekleyip düşer.

Ölçümler, yerelde 2 işlemci, tek işçi ve 8 kat yavaş işlemciyle:

- Yamasızken 43 denemenin 11'i takıldı (turlara göre 3/3, 2/2, 1/2, 3/12, 0/12, 2/12). Takılan her denemede sıra aynıydı: sinyal verildi, `hmr-client` başlayıp bitti, `domcontentloaded` sinyali sildi.
- Yamalıyken 36 denemenin hiçbiri takılmadı. Takılma rastlantıya bağlı olduğu için bu sayı kesin kanıt değildir; asıl kanıt kaydedilen sıradır.

Aynı kod Playwright 1.65.1'de ve 2026-11-15 tarihli 1.66 ön sürümünde de var. Yükseltme hatayı çözmüyor.

## Düşünülen diğer yollar

- **`sayfaHazir`'da "networkidle" yerine kendi ağ beklememizi yazmak.** Gezinmeden önce başlamış isteklerin bitip bitmediğini Playwright'ın genel olaylarıyla bilemeyiz. Bekleme, iki yüzü aşkın testin dayandığı koşulu gevşetirdi.
- **Takıldığında sayfaya yapay bir istek attırmak.** Sinyal böylece yeniden kurulurdu. Ama bu, Playwright'ın iç davranışına dayanan gizli bir dolanmadır ve testin ne beklediğini bulanıklaştırır.
- **Yalnız bu testte süre sınırını yükseltmek.** Yarış kalıcıdır: sinyal hiç gelmez, süre yetmez.
- **Playwright'ı yükseltmek.** En yeni sürümde de aynı kod var.
- **İşlemci yavaşlatmasını gezinmeden sonra açmak.** Testin amacı yavaş işlemcide sayfanın bağlanmasını denemektir; yavaşlatma yüklemeden önce açık olmalıdır.

## Sonuçları

- Playwright yükseltilirken yama yeni sürüme yeniden uygulanmalı ya da yarışın o sürümde düzeldiği ölçülmelidir. Yama uygulanamazsa pnpm kurulumu durur. Yama kaydı kaldırılırsa `playwright-yamasi.test.ts` kırmızıya düşer.
- Yama yalnız testlerin davranışını değiştirir, ürünün kodunu değiştirmez. Ama pnpm kurulumu yama dosyasını okur: çekirdeğin Docker görüntüsü `yamalar/` klasörünü de içeri alır, yoksa görüntünün kurulumu `ERR_PNPM_PATCH_NOT_FOUND` ile durur (bağımsız kontrolün bulgusu, ölçüldü). Görüntüye giren yalnız yama dosyasıdır; Playwright canlıda çalışmaz.
- Yama klasörü pnpm'in varsayılan adı (`patches/`) yerine kuralımıza göre Türkçe adlıdır (`yamalar/`); yeni yama `pnpm patch-commit <klasör> --patches-dir yamalar` ile yazılır.
- Değişiklikten sonra zamanlayıcı, sinyal verilmişken de her istek dalgasının ardından kurulur. Sinyal yalnız kendi hâline (verildi) yeniden yazılır, ek bir yan etkisi ölçülmedi.
- Hata Playwright'a bildirilmedi. Bildirmek dışarıya yazı göndermektir; kullanıcı isterse yapılır.
