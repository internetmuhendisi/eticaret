// Hız ölçümü (kart 0146, karar 0124, .claude/rules/kurallari-koruyan-kontroller.md "Hız ve boyut ölçümü"). Her vitrin
// sayfa türü (uctan-uca/vitrin-sayfalari.ts) canlıdaki gibi derlenmiş çekirdekte, şifreli HTTP/2 vekilin arkasında,
// yavaş telefon koşuluyla (hedefler.ts) olcumSayisi kez açılır; her ölçüm temiz bir tarayıcı bağlamıdır (önbellek yok).
// - Ana içerik (LCP) ve kayma (CLS) tarayıcının kendi ölçümüyle (PerformanceObserver) okunur; kayma web-vitals'ın
//   pencere kuralıyladır (1 sn ara, en çok 5 sn).
// - Tepki (INP) sayfa bağlandıktan sonra (sayfaHazir, karar 0099) üst kısmın ilk düğmesine (telefonda menü) basılıp
//   pencerenin açıldığı görülerek, Escape ile kapatılarak ölçülür: etkileşimin en uzun olayı.
// - Kod, sayfa yüklenince inen JavaScript dosyalarının sıkıştırılmış boyutudur (yanıt başlıkları dahil; sayfanın
//   içine gömülü veri sayılmaz).
// - İşlemci yavaşlatması makinenin hızına göre, her sayfadan önce yeniden ayarlanır: aynı hesap bu makinede
//   referansIslemciSuresi'nden ne kadar uzun sürerse yavaşlatma o kadar azalır, en az enAzYavaslatma. Hattın makinesi
//   bilgisayardan yaklaşık iki kat yavaştır (playwright.config.ts); sabit 4 kat orada 8 kat telefon demek olurdu.
//   Bir kez yapılan ayar anlık yüke denk gelince bütün ölçüm yavaşlatmasız kalıyordu (bağımsız kontrolün bulgusu).
// Ortanca ölçüm hedefi aşarsa test kırmızıdır. Ölçümler test çıktısına yazılır.
import { type Browser, expect, test } from "@playwright/test";
import { sayfaHazir } from "../uctan-uca/sayfa-hazir";
import { ekranSayfalari } from "../uctan-uca/vitrin-sayfalari";
import { bilinenAsimlar, hizHedefleri, olcumSayisi, yavasTelefon } from "./hedefler";

type Olcum = { anaIcerik: number; kayma: number; tepki: number; kod: number };

const ortanca = (degerler: number[]) => {
  const sirali = [...degerler].sort((a, b) => a - b);
  return sirali[Math.floor(sirali.length / 2)] ?? Number.NaN;
};

// Makinenin işlemci ölçüsü: yavaşlatmasız sayfada sabit bir hesabın süresi (yedi denemenin ortancası).
const islemciYavaslatmasi = async (tarayici: Browser) => {
  const sayfa = await tarayici.newPage();
  await sayfa.setContent("<p></p>");
  const sureler: number[] = [];
  for (let deneme = 0; deneme < 7; deneme += 1) {
    sureler.push(
      await sayfa.evaluate(() => {
        const bas = performance.now();
        let toplam = 0;
        for (let i = 0; i < 2e7; i += 1) toplam += Math.sqrt(i) % 7;
        return toplam >= 0 ? performance.now() - bas : 0;
      }),
    );
  }
  await sayfa.close();
  const oran =
    (yavasTelefon.islemciYavaslatma * yavasTelefon.referansIslemciSuresi) / ortanca(sureler);
  return Math.max(yavasTelefon.enAzYavaslatma, Math.round(oran * 10) / 10);
};

const olc = async (
  tarayici: Browser,
  adres: string,
  yavaslatma: number,
  menu: boolean,
): Promise<Olcum> => {
  const baglam = await tarayici.newContext({
    viewport: yavasTelefon.ekran,
    isMobile: true,
    deviceScaleFactor: 2,
    ignoreHTTPSErrors: true,
  });
  try {
    const sayfa = await baglam.newPage();
    const cdp = await baglam.newCDPSession(sayfa);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: yavasTelefon.gecikme,
      downloadThroughput: yavasTelefon.indirme,
      uploadThroughput: yavasTelefon.yukleme,
    });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: yavaslatma });
    await sayfa.addInitScript(() => {
      const kayit = { anaIcerik: 0, kayma: 0, tepki: 0 };
      Object.assign(window, { __hiz: kayit });
      new PerformanceObserver((liste) => {
        for (const giris of liste.getEntries()) kayit.anaIcerik = giris.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
      let pencere = 0;
      let ilk = 0;
      let son = 0;
      new PerformanceObserver((liste) => {
        for (const giris of liste.getEntries() as (PerformanceEntry & {
          value: number;
          hadRecentInput: boolean;
        })[]) {
          if (giris.hadRecentInput) continue;
          const ayni = pencere > 0 && giris.startTime - son < 1000 && giris.startTime - ilk < 5000;
          pencere = ayni ? pencere + giris.value : giris.value;
          if (!ayni) ilk = giris.startTime;
          son = giris.startTime;
          kayit.kayma = Math.max(kayit.kayma, pencere);
        }
      }).observe({ type: "layout-shift", buffered: true });
      new PerformanceObserver((liste) => {
        for (const giris of liste.getEntries() as (PerformanceEntry & {
          interactionId?: number;
        })[]) {
          if (giris.interactionId) kayit.tepki = Math.max(kayit.tepki, giris.duration);
        }
      }).observe({
        type: "event",
        buffered: true,
        durationThreshold: 16,
      } as PerformanceObserverInit);
    });
    await sayfa.goto(adres, { waitUntil: "load", timeout: 120_000 });
    await sayfa.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => undefined);
    const kod = await sayfa.evaluate(() =>
      (performance.getEntriesByType("resource") as PerformanceResourceTiming[])
        .filter((giris) => /\.js(\?|$)/u.test(giris.name))
        .reduce((toplam, giris) => toplam + (giris.transferSize || giris.encodedBodySize), 0),
    );
    // Etkileşim sayfa bağlandıktan sonra yapılır; düğme pencereyi açmazsa ölçüm boştur, test kırmızıdır. Menüsü olmayan
    // sayfada (ödeme adımı, kart 0213) etkileşim yoktur, tepki 0 kalır.
    await sayfaHazir(sayfa);
    if (menu) {
      await sayfa.getByRole("banner").getByRole("button").first().click();
      await expect(sayfa.getByRole("dialog")).toBeVisible();
      await sayfa.keyboard.press("Escape");
      await expect(sayfa.getByRole("dialog")).toBeHidden();
    }
    await sayfa.waitForTimeout(500);
    const sonuc = await sayfa.evaluate(
      () => (window as unknown as { __hiz: Omit<Olcum, "kod"> }).__hiz,
    );
    return { ...sonuc, kod: kod / 1024 };
  } finally {
    await baglam.close();
  }
};

for (const [tur, { adres, menu = true }] of Object.entries(ekranSayfalari)) {
  test(`hız ölçümü: ${tur}`, async ({ browser }) => {
    const yavaslatma = await islemciYavaslatmasi(browser);
    const olcumler: Olcum[] = [];
    for (let sira = 0; sira < olcumSayisi; sira += 1)
      olcumler.push(await olc(browser, adres, yavaslatma, menu));
    const sonuc = {
      anaIcerik: ortanca(olcumler.map((o) => o.anaIcerik)),
      kayma: ortanca(olcumler.map((o) => o.kayma)),
      tepki: ortanca(olcumler.map((o) => o.tepki)),
      kod: ortanca(olcumler.map((o) => o.kod)),
    };
    const ozet = `${tur}: ana içerik ${Math.round(sonuc.anaIcerik)} ms, kayma ${sonuc.kayma.toFixed(3)}, tepki ${Math.round(sonuc.tepki)} ms, kod ${Math.round(sonuc.kod)} KB (işlemci ${yavaslatma}x)`;
    test.info().annotations.push({ type: "ölçüm", description: ozet });
    process.stdout.write(`${ozet}\n`);
    expect(sonuc.anaIcerik, ozet).toBeGreaterThan(0);
    // Bilinen aşımdaki ölçü hedef yerine kendi üst sınırıyla karşılaştırılır (hedefler.ts).
    const asim = bilinenAsimlar[tur];
    for (const olcu of Object.keys(hizHedefleri) as (keyof typeof hizHedefleri)[]) {
      const sinir = asim?.olcu === olcu ? asim.ustSinir : hizHedefleri[olcu];
      expect(sonuc[olcu], `${ozet}; ${olcu} sınırı ${sinir}`).toBeLessThanOrEqual(sinir);
    }
    if (asim !== undefined && sonuc[asim.olcu] <= hizHedefleri[asim.olcu]) {
      process.stdout.write(
        `${tur}: bilinen aşım (kart ${asim.kart}) bu ölçümde hedefin içinde; düzeldiyse listeden çıkarılır.\n`,
      );
    }
  });
}
