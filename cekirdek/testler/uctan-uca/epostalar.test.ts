// Panelin E-postalar ekranları tarayıcıda (kart 0279, karar 0197):
// - Mağaza sahibi menüden klavyeyle gelir. Gönderen kartında geçersiz yanıt adresi alanın altında yazar, odak alanda;
//   düzeltilince kaydedilir (veritabanında). Test sonunda eski değerler geri yazılır.
// - Listeden "Kargoya verildi"nin metnine klavyeyle gidilir. Bilinmeyen bilgi ([İndirim kodu]) alanın altında hangi adın
//   yazıldığını ve kullanılabilenleri söyler, odak alanda; hiçbir şey yazılmaz.
// - "Bilgi ekle" imlecin yerine bilgiyi ekler, odak alana döner; önizleme örnek siparişle yeni metni çizer. Kayıttan
//   sonra listede "Değiştirildi". "Varsayılan metne dön" onay penceresiyle (önce Vazgeç) metni geri getirir.
// - Önizlemenin telefon genişliği klavyeyle seçilir, çerçeve daralır.
// - İki ekran, hatalı form ve onay penceresi iki renkte ve üç genişlikte taramadan geçer, yana kaymaz; konsolda hata yok.
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri";
import { metin } from "../../metinler/site-metni";
import { epostaMetinleri } from "../../moduller/eposta/model";
import { magazaAyarlariniOku, siteninServisi } from "../../moduller/magaza-ayarlari/servis";
import { baglan, veritabaniAdresi } from "../../veritabani/baglanti";
import { epostalarAdresi, epostaMetniAdresi } from "../../yonetim-paneli/adresler";
import { hataOzeti } from "./form-hatasi";
import { konsoluDinle } from "./konsol";
import { sayfaHazir } from "./sayfa-hazir";
import { tara } from "./tarama";
import { ayriBaglanti, paneleGir, yoneticiAc } from "./yonetici";

if (existsSync(".env")) process.loadEnvFile(".env");

const vt = baglan(veritabaniAdresi());
const genislikler = [
  { width: 375, height: 800 },
  { width: 768, height: 1000 },
  { width: 1280, height: 900 },
] as const;

test.afterAll(async () => {
  await vt.$client.end();
});

// E-posta önizlemesinin çerçevesi betiğe kapalıdır (sandbox): tarayıcının betiği orada çalışamaz, tarama çerçevede
// sonsuza kadar bekler. Çerçeve taramanın dışındadır; önizlenen e-postanın kendisi ayrı sayfada taranır.
const cercevesiz = { haric: ["iframe"] } as const;
const ikiRenkUcGenislik = async (page: Page, ne: string) => {
  for (const renk of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: renk });
    for (const boyut of genislikler) {
      await page.setViewportSize(boyut);
      await tara(page, `${ne} ${renk} ${boyut.width}`, cercevesiz);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        `${ne} ${renk} ${boyut.width} yana kaymaz`,
      ).toBe(true);
    }
  }
  await page.emulateMedia({ colorScheme: "light" });
  await page.setViewportSize({ width: 1280, height: 900 });
};

const kod = "kargoya-verildi";
const metniSil = () => vt.delete(epostaMetinleri).where(eq(epostaMetinleri.kod, kod));

test("e-postalar: gönderen, metin, bilgi ekle, önizleme, varsayılana dönüş; tarama", async ({
  page,
}) => {
  test.setTimeout(300_000);
  const hatalar = konsoluDinle(page, {
    // Hatalı formlar bilerek gönderilir: uç 400 döner. Playwright'ın izi (trace) her çerçeveye kendi betiğini koyar;
    // betiğe kapalı önizleme çerçevesinde tarayıcı bunu "Blocked script execution" diye yazar (boş sayfada ölçüldü: iz
    // kapalıyken 0, açıkken 1). Çerçevenin betiğe kapalı olduğu ve e-postanın betik taşımadığı aşağıda ölçülür.
    haric: (m) =>
      m.includes("status of 400") || m.startsWith("Blocked script execution in 'about:srcdoc'"),
  });
  const once = await magazaAyarlariniOku(vt);
  await metniSil();
  try {
    await ayriBaglanti(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await paneleGir(page, yoneticiAc());

    const menu = page.getByRole("navigation", { name: metin("yonetim.cerceve.menu") });
    await menu.getByRole("link", { name: metin("yonetim.sayfa.epostalar.ad") }).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`${epostalarAdresi}$`));
    await sayfaHazir(page);
    await ikiRenkUcGenislik(page, "e-postalar");

    // Gönderen: tek hata alanın altında, odak alanda; düzeltince kaydedilir.
    const yanit = page.getByRole("textbox", {
      name: new RegExp(`^${metin("yonetim.epostalar.gonderen.yanitAdresi")}`),
    });
    const gonderenAdi = page.getByRole("textbox", {
      name: new RegExp(`^${metin("yonetim.epostalar.gonderen.gonderenAdi")}`),
    });
    const gonderenKaydet = page.getByRole("button", {
      name: metin("yonetim.epostalar.gonderen.kaydet"),
    });
    // Her çalışmada farklı ad: yarıda kalan bir çalışmanın değeri formu "değişmemiş" göstermesin.
    const yeniAd = `Uçtan Uca ${randomBytes(3).toString("hex")}`;
    await gonderenAdi.fill(yeniAd);
    await yanit.fill("destek");
    await gonderenKaydet.focus();
    await page.keyboard.press("Enter");
    await expect(yanit).toBeFocused();
    await expect(page.getByText(metin("yonetim.epostalar.hata.eposta"))).toBeVisible();
    await expect(hataOzeti(page)).toHaveCount(0);
    expect((await magazaAyarlariniOku(vt)).epostaGonderenAdi).toBe(once.epostaGonderenAdi);
    await yanit.fill("destek@ornek.test");
    await gonderenKaydet.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText(metin("yonetim.epostalar.gonderen.kaydedildi"))).toBeVisible();
    const sonra = await magazaAyarlariniOku(vt);
    expect([sonra.epostaGonderenAdi, sonra.epostaYanitAdresi]).toEqual([
      yeniAd,
      "destek@ornek.test",
    ]);

    // Listeden metnin ekranına.
    const ad = metin(`yonetim.epostalar.birim.${kod}.ad`);
    const duzenle = page.getByRole("link", {
      name: metin("yonetim.epostalar.liste.duzenleAdi").replace("{ad}", ad),
    });
    await duzenle.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(epostaMetniAdresi(kod));
    await sayfaHazir(page);
    await expect(page.getByRole("heading", { level: 1, name: ad })).toBeVisible();
    const cerceve = page.frameLocator(
      `iframe[title="${metin("yonetim.epostalar.onizleme.cerceve")}"]`,
    );
    // Önizleme betiğe kapalı çerçevededir; e-posta betik, olay özniteliği ve javascript: taşımaz.
    const onizlemeCercevesi = page.locator(
      `iframe[title="${metin("yonetim.epostalar.onizleme.cerceve")}"]`,
    );
    await expect(onizlemeCercevesi).toHaveAttribute("sandbox", "allow-same-origin");
    const ham = (await onizlemeCercevesi.getAttribute("srcdoc")) ?? "";
    expect(ham).toContain("<h1");
    expect([ham.includes("<script"), / on[a-z]+=/i.test(ham), ham.includes("javascript:")]).toEqual(
      [false, false, false],
    );
    await expect(cerceve.locator("h1")).toBeVisible();
    await ikiRenkUcGenislik(page, "e-posta metni");

    const giris = page.getByRole("textbox", {
      name: new RegExp(`^${metin("yonetim.epostalar.metin.giris")}`),
    });
    const kaydet = page.getByRole("button", { name: metin("yonetim.epostalar.metin.kaydet") });
    // Bilinmeyen bilgi: alanın altında, odak alanda; hiçbir şey yazılmaz.
    await giris.fill("Merhaba [İndirim kodu]");
    await kaydet.focus();
    await page.keyboard.press("Enter");
    await expect(giris).toBeFocused();
    await expect(
      page.getByText(/\[İndirim kodu\] bu e-postada yok\. Kullanılabilenler: \[Müşteri adı\]/),
    ).toBeVisible();
    expect(await vt.select().from(epostaMetinleri).where(eq(epostaMetinleri.kod, kod))).toEqual([]);
    await ikiRenkUcGenislik(page, "e-posta metni hatalı");

    // Bilgi ekle: imlecin yerine, odak alana döner; önizleme yeni metni çizer.
    await giris.fill("Selam ");
    await giris.focus();
    await page.keyboard.press("End");
    const bilgiDugmesi = page.getByRole("button", {
      name: metin("yonetim.epostalar.metin.bilgiEkleAdi").replace("{ad}", metin("eposta.bilgi.ad")),
    });
    await bilgiDugmesi.focus();
    await page.keyboard.press("Enter");
    await expect(giris).toHaveValue(`Selam [${metin("eposta.bilgi.ad")}]`);
    await expect(giris).toBeFocused();
    await expect(cerceve.getByText(`Selam ${metin("yonetim.epostalar.ornek.ad")}`)).toBeVisible();

    // Önizlemedeki e-postanın kendisi: telefon ve bilgisayar genişliğinde taramadan geçer, yana kaymaz.
    const html = await page
      .locator(`iframe[title="${metin("yonetim.epostalar.onizleme.cerceve")}"]`)
      .getAttribute("srcdoc");
    const eposta = await page.context().newPage();
    await eposta.setContent(html ?? "");
    for (const width of [375, 1280]) {
      await eposta.setViewportSize({ width, height: 900 });
      await tara(eposta, `önizlenen e-posta ${width}`);
      expect(
        await eposta.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
    }
    await eposta.close();

    await kaydet.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText(metin("yonetim.epostalar.metin.kaydedildi"))).toBeVisible();
    const [kayitli] = await vt.select().from(epostaMetinleri).where(eq(epostaMetinleri.kod, kod));
    expect(kayitli?.giris).toEqual([{ yazi: "Selam " }, { bilgi: "ad" }]);

    // Önizlemenin telefon genişliği: çerçeve telefonun genişliğine (375 px) daralır, bilgisayarda sütunu doldurur.
    const cerceveGenisligi = () =>
      page
        .locator(`iframe[title="${metin("yonetim.epostalar.onizleme.cerceve")}"]`)
        .evaluate((oge) => oge.getBoundingClientRect().width);
    const bilgisayarda = await cerceveGenisligi();
    await page.getByRole("radio", { name: metin("yonetim.epostalar.onizleme.bilgisayar") }).focus();
    // Radix seçimi tuş bırakılmadan yapar: tuş kısa süre basılı tutulur (kart 0214'ün ölçümü).
    await page.keyboard.press("ArrowRight", { delay: 50 });
    await expect(
      page.getByRole("radio", { name: metin("yonetim.epostalar.onizleme.telefon") }),
    ).toBeChecked();
    expect(await cerceveGenisligi()).toBeLessThanOrEqual(375);
    expect(bilgisayarda).toBeGreaterThan(375);

    // Varsayılan metne dön: onay penceresi, önce Vazgeç.
    const varsayilan = page.getByRole("button", {
      name: metin("yonetim.epostalar.metin.varsayilanaDon"),
    });
    await varsayilan.focus();
    await page.keyboard.press("Enter");
    const pencere = page.getByRole("alertdialog");
    await expect(pencere).toBeVisible();
    await tara(page, "varsayılana dön onayı", cercevesiz);
    await pencere.getByRole("button", { name: metin("ortak.islem.vazgec") }).click();
    await expect(pencere).toBeHidden();
    await expect(giris).toHaveValue(`Selam [${metin("eposta.bilgi.ad")}]`);
    await varsayilan.focus();
    await page.keyboard.press("Enter");
    await pencere
      .getByRole("button", { name: metin("yonetim.epostalar.metin.varsayilanEvet") })
      .click();
    await expect(page.getByText(metin("yonetim.epostalar.metin.varsayilanaDonuldu"))).toBeVisible();
    await expect(giris).toHaveValue(
      /\[Müşteri adı\], \[Sipariş no\] numaralı siparişiniz yola çıktı\./,
    );
    const [donen] = await vt.select().from(epostaMetinleri).where(eq(epostaMetinleri.kod, kod));
    expect([donen?.konu, donen?.giris, donen?.kapanis]).toEqual([null, null, null]);
    expect(hatalar).toEqual([]);
  } finally {
    await metniSil();
    await siteninServisi(calisanSite()).degistir(vt, sistemIslemi("uctan-uca-epostalar"), {
      epostaGonderenAdi: once.epostaGonderenAdi,
      epostaYanitAdresi: once.epostaYanitAdresi,
    });
  }
});
