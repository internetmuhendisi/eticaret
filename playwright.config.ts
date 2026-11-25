// Tarayıcı testleri (karar 0018, .claude/rules/test.md).
// Yalnız uctan-uca/ klasörlerindeki *.test.ts ve *.test.tsx dosyaları çalışır.
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { parseEnv } from "node:util";
import { defineConfig, devices } from "@playwright/test";
import { dosyaKlasoruDegiskeni } from "./cekirdek/kayitlar/dosya";
import { temaDemosuAdresiDegiskeni } from "./cekirdek/kayitlar/site";
import {
  demoSitesi,
  projedekiSiteler,
  temaDemosuOrtami,
  yereldekiDemoAdresi,
} from "./komutlar/tema-demosu-adresi.mts";

// Testler başka bir site verilmezse demo site Örnek Mağaza'yla çalışır (karar 0007, 0021).
// Değişken hem uygulamaya hem testlere geçer.
const { SITE_KLASORU = join(import.meta.dirname, "siteler", "ornek-magaza") } = process.env;
// Sitenin dosya klasörü (karar 0058): hazırlığın kurduğu görseller buraya yazılır, uygulama buradan okur. Veritabanı
// gibi çalışmalar arasında kalır; kayıt dışıdır (sunucu/olusan/, karar 0028).
const {
  [dosyaKlasoruDegiskeni]: DOSYA_KLASORU = join(
    import.meta.dirname,
    "sunucu",
    "olusan",
    "dosyalar",
    basename(SITE_KLASORU),
  ),
} = process.env;
mkdirSync(DOSYA_KLASORU, { recursive: true, mode: 0o700 });
Object.assign(process.env, { SITE_KLASORU, [dosyaKlasoruDegiskeni]: DOSYA_KLASORU });
// Panelin "Demoyu gez" bağlantısı (kart 0148): projedeki demo sitesinin yerel adresi. Testlerde demo sitesi
// açılmaz; tema ekranı testi bağlantıyı ve açılan sekmenin adresini ölçer.
if (process.env[temaDemosuAdresiDegiskeni] === undefined) {
  Object.assign(
    process.env,
    temaDemosuOrtami(yereldekiDemoAdresi(demoSitesi(projedekiSiteler()), 3000)),
  );
}

// Kalıplar tam yola göre eşleşir. Çalışma kopyaları (.claude/worktrees/) bu klasörün içinde durduğu için yalnız
// bu kopyanın kendi .claude klasörü dışarıda bırakılır.
// Kartla ödeme eklentisi (kart 0215): tarayıcı testlerinde uygulama gerçek ödeme kuruluşuna değil, ayrı süreçte açılan
// sahte kuruluşa bağlanır (deneme ortamında yalnız yerel adres kabul edilir, iyzico.ts). Anahtarlar yalnız bu
// sahte kuruluş içindir; .env'deki gerçek deneme anahtarları burada kullanılmaz. Dönüş adresi bu uygulamadır.
const sahteKurulusPortu = 3999;
Object.assign(process.env, {
  KARTLA_ODEME_ANAHTARI: "tarayici-testi-anahtari",
  KARTLA_ODEME_GIZLI_ANAHTARI: "tarayici-testi-gizli-anahtari",
  KARTLA_ODEME_DENEME_ADRESI: `http://127.0.0.1:${sahteKurulusPortu}`,
  SITE_ADRESI: process.env["SITE_ADRESI"] || "http://localhost:3000",
});
// Uygulama e-postayı yerel posta kutusuna gönderebilir sayılır (kart 0240): sipariş alındı sayfası "e-postanıza
// gönderdik" der. Uygulama yalnız kuyruğa yazar; testlerde arka plan süreci yoktur, e-postayı test kendisi gönderir.
if (process.env["EPOSTA_SUNUCUSU"] === undefined) {
  const smtpPortu =
    process.env["POSTA_SMTP_PORTU"] ??
    (existsSync(".env") ? parseEnv(readFileSync(".env", "utf8"))["POSTA_SMTP_PORTU"] : undefined);
  if (smtpPortu !== undefined) process.env["EPOSTA_SUNUCUSU"] = `smtp://localhost:${smtpPortu}`;
}

const ortakDislananlar = ["**/node_modules/**", `${import.meta.dirname}/.claude/**`];
const temaDegisikligiTesti = "**/uctan-uca/tema.test.ts";

export default defineConfig({
  testDir: ".",
  testMatch: ["**/uctan-uca/**/*.test.ts", "**/uctan-uca/**/*.test.tsx"],
  testIgnore: ortakDislananlar,
  // Sitenin başlangıç kataloğu, menüleri ve düzeni testlerden önce kurulur (kart 0129). Sunucu canlıdaki gibi
  // derlenmiştir (kart 0251): yolların ısınması (kart 0222, 0164) yalnız geliştirme aşamasındadır.
  globalSetup: "./cekirdek/testler/uctan-uca/hazirlik.ts",
  // Yalnız geliştirme sunucusunda anlamı olan testler (bilerek hata veren deneme sayfası gibi) bu aşamada
  // çalışmaz, geliştirme aşamasında çalışır (playwright.gelistirme.config.ts, karar 0184). Etiket burada düz yazılır:
  // yayın komutu ayar dosyasını korur (cekirdek/testler/uctan-uca/gelistirme-etiketleri.ts ile aynılığı birim testte).
  grepInvert: /@yalniz-gelistirmede/,
  // Bir testin süre sınırı (kart 0129). Playwright'ın 30 saniyesi kontrol hattında yetmiyor: hattın makinesi
  // bilgisayarın yüksüz hâlinin yaklaşık iki katı sürer (bütün takım 14,4 ve 3,8 dakika). Ölçüldü: iki renkte ve üç
  // genişlikte tarayan bölüm kütüphanesi testi bilgisayarda yüksüz 15, yük ortalaması 23'te 31 saniye sürdü, hatta
  // 30 saniyede sınıra takıldı; hattaki öteki en uzun testler 16–20 saniye. Beklentilerin kendi sınırı (5 saniye)
  // değişmez.
  timeout: 60_000,
  forbidOnly: true,
  reporter: "list",
  // Düşen testin izi (kart 0207, karar 0131): her adımın zamanı, ağ istekleri ve sayfanın görüntüleri test-results/
  // altında kalır; geçen testinki silinir. Kontrol hattı düşüşte bu klasörü saklar: yerelde üretilemeyen düşüşün
  // hangi adımda beklediği izden okunur.
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
  // Çekirdeği testten önce canlıdaki gibi derleyip açar (kart 0251, komutlar/tarayici-sunucusu.mts); açık bir
  // sunucu varsa onu kullanır (yerelde elle açılmış geliştirme sunucusu da olabilir).
  webServer: [
    {
      // Sunucunun çıktısı hattın günlüğüne değil kayıt dışı bir dosyaya yazılır, hat dosyayı düşen testlerin iziyle
      // saklar (kart 0226, komutlar/sunucu-gunlugu.mts). Derlemenin çıktısı ve hata akışı burada görünür.
      command: "node komutlar/tarayici-sunucusu.mts | node komutlar/sunucu-gunlugu.mts",
      url: "http://localhost:3000",
      reuseExistingServer: true,
      // Derleme hattın makinesinde yarım dakika sürer (hız ölçümünün günlüğü); sınır açılışla birlikte geniştir.
      timeout: 300_000,
    },
    {
      command: "node cekirdek/eklentiler/kartla-odeme/testler/sahte-kurulus-sunucusu.ts",
      url: `http://127.0.0.1:${sahteKurulusPortu}/saglik`,
      reuseExistingServer: true,
    },
  ],
  // Tema değişikliği bütün vitrinin görünüşünü değiştirir (kart 0148): tema ekranının testi öteki testler bittikten
  // sonra kendi aşamasında çalışır, aynı anda çalışan bir testin ölçtüğü renkleri değiştirmez.
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: [...ortakDislananlar, temaDegisikligiTesti],
    },
    {
      name: "tema-degisikligi",
      use: { ...devices["Desktop Chrome"] },
      testMatch: temaDegisikligiTesti,
      dependencies: ["chromium"],
    },
  ],
});
