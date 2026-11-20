// Form parçaları gerçek tarayıcıda tasarım değerleriyle görünür (kart 0102, karar 0076). Vitrinin ve
// panelin giriş sayfası açık ve koyu temada, üç genişlikte açılır: her rengin tasarım değerinden geldiği,
// yazı-zemin kontrastının tarayıcının gerçekten çizdiği renklerle ölçüldüğü, yazı tiplerinin sitenin
// kendi sunucusundan yüklendiği, dış sunucuya hiç istek gitmediği ve sayfanın yana kaymadığı ölçülür.
import { expect, type Locator, type Page, test } from "@playwright/test";
import {
  type RenkAdi,
  varsayilanTemaDegerleri,
} from "../../../bilesenler/tasarim-degerleri/degerler";
import { kontrastOrani } from "../../../bilesenler/tasarim-degerleri/kontrast";
import type { MetinAnahtari } from "../../metinler/metin";
import { metin } from "../../metinler/site-metni";
import { sayfaHazir } from "./sayfa-hazir";

// Tarayıcının verdiği "rgb(r, g, b)" renk, #RRGGBB biçimine çevrilir.
const onaltilik = (rgb: string) => {
  const parcalar = rgb.match(/^rgba?\((\d+), (\d+), (\d+)(?:, 1)?\)$/);
  if (parcalar === null) throw new Error(`Saydam ya da tanınmayan renk: ${rgb}`);
  return `#${parcalar
    .slice(1, 4)
    .map((k) => Number(k).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
};

const ozellik = async (oge: Locator, ad: string) =>
  onaltilik(await oge.evaluate((e, a) => getComputedStyle(e).getPropertyValue(a), ad));

const sayfalar: {
  ad: string;
  adres: string;
  eposta: MetinAnahtari;
  gonder: MetinAnahtari;
  hata: MetinAnahtari;
  // Gönder düğmesinin zemin ve yazı rengi: vitrin girişi koyu düğmedir (kart 0237, taslak), panel ana renktedir.
  dugme: { zemin: RenkAdi; yazi: RenkAdi };
}[] = [
  {
    ad: "vitrin",
    adres: "/giris",
    eposta: "vitrin.giris.eposta",
    gonder: "vitrin.giris.gonder",
    hata: "vitrin.giris.hataBilgi",
    dugme: { zemin: "yazi", yazi: "zemin" },
  },
  {
    ad: "panel",
    adres: "/yonetim/giris",
    eposta: "yonetim.giris.eposta",
    gonder: "yonetim.giris.gonder",
    hata: "yonetim.giris.hataBilgi",
    dugme: { zemin: "birincil", yazi: "birincil-ustu" },
  },
];

const genislikler = [
  { ad: "telefon", width: 375, height: 800 },
  { ad: "tablet", width: 768, height: 1000 },
  { ad: "masaüstü", width: 1280, height: 900 },
];

const disIstekleriTopla = (page: Page) => {
  const disarisi: string[] = [];
  page.on("request", (istek) => {
    const adres = new URL(istek.url());
    if (adres.protocol !== "data:" && adres.origin !== "http://localhost:3000") {
      disarisi.push(istek.url());
    }
  });
  return disarisi;
};

for (const sayfa of sayfalar) {
  for (const tema of ["acik", "koyu"] as const) {
    const renk = (ad: RenkAdi) => varsayilanTemaDegerleri.renkler[tema][ad];

    for (const genislik of genislikler) {
      test(`${sayfa.ad} giriş sayfası ${tema} temada, ${genislik.ad} genişliğinde tasarım değerleriyle görünür`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: genislik.width, height: genislik.height });
        await page.emulateMedia({ colorScheme: tema === "acik" ? "light" : "dark" });
        const disarisi = disIstekleriTopla(page);
        await page.goto(sayfa.adres);
        await sayfaHazir(page);

        // Zemin ve yazı tipi kök öğeye verilir (tailwind.css).
        const govde = page.locator("html");
        // Form sayfanın ana içeriğindedir; vitrinin üst ve alt kısmı (kart 0108) aynı adlı yazı taşıyabilir.
        const icerik = page.getByRole("main");
        const etiket = icerik.getByText(metin(sayfa.eposta), { exact: true });
        const alan = icerik.getByLabel(metin(sayfa.eposta), { exact: true });
        const dugme = icerik.getByRole("button", { name: metin(sayfa.gonder) });
        await expect(dugme).toBeEnabled();

        // Renkler tasarım değerlerinden gelir.
        expect(await ozellik(govde, "background-color")).toBe(renk("zemin"));
        expect(await ozellik(etiket, "color")).toBe(renk("yazi"));
        expect(await ozellik(alan, "border-top-color")).toBe(renk("alan-kenari"));
        expect(await ozellik(alan, "background-color")).toBe(renk("zemin"));
        expect(await ozellik(dugme, "background-color")).toBe(renk(sayfa.dugme.zemin));
        expect(await ozellik(dugme, "color")).toBe(renk(sayfa.dugme.yazi));

        // Kontrast tarayıcının çizdiği renklerle ölçülür.
        const zemin = await ozellik(govde, "background-color");
        expect(kontrastOrani(await ozellik(etiket, "color"), zemin)).toBeGreaterThanOrEqual(4.5);
        expect(
          kontrastOrani(await ozellik(alan, "border-top-color"), zemin),
        ).toBeGreaterThanOrEqual(3);
        expect(
          kontrastOrani(await ozellik(dugme, "color"), await ozellik(dugme, "background-color")),
        ).toBeGreaterThanOrEqual(4.5);

        // Odaklanılan alan odak rengiyle görünür.
        await alan.focus();
        await page.keyboard.press("Shift+Tab");
        await page.keyboard.press("Tab");
        await expect(alan).toBeFocused();
        expect(await ozellik(alan, "outline-color")).toBe(renk("odak"));
        expect(kontrastOrani(await ozellik(alan, "outline-color"), zemin)).toBeGreaterThanOrEqual(
          3,
        );

        // Hata kutusu tehlike renkleriyle ve okunur görünür.
        await dugme.click();
        const uyari = page.getByRole("alert").filter({ hasText: metin(sayfa.hata) });
        await expect(uyari).toBeVisible();
        expect(await ozellik(uyari, "color")).toBe(renk("tehlike-yazi"));
        expect(await ozellik(uyari, "background-color")).toBe(renk("tehlike-zemin"));
        expect(
          kontrastOrani(await ozellik(uyari, "color"), await ozellik(uyari, "background-color")),
        ).toBeGreaterThanOrEqual(4.5);

        // Yazı tipleri yüklendi ve sitenin kendi sunucusundan geldi.
        const yaziTipleri = await page.evaluate(async () => {
          await document.fonts.ready;
          return {
            govde: getComputedStyle(document.body).fontFamily,
            baslik: getComputedStyle(document.querySelector("h1") ?? document.body).fontFamily,
            inter: document.fonts.check('14px "Inter Variable"', "ğüşıöçĞÜŞİÖÇ"),
            jost: document.fonts.check('24px "Jost Variable"', "ğüşıöçĞÜŞİÖÇ"),
            yuklu: [...document.fonts]
              .filter((y) => y.status === "loaded")
              .map((y) => y.family.replaceAll('"', "")),
          };
        });
        expect(yaziTipleri.govde).toMatch(/^"?Inter Variable"?,/);
        expect(yaziTipleri.baslik).toMatch(/^"?Jost Variable"?,/);
        expect(yaziTipleri.yuklu).toContain("Inter Variable");
        expect(yaziTipleri.yuklu).toContain("Jost Variable");
        expect(yaziTipleri.inter && yaziTipleri.jost).toBe(true);
        expect(disarisi).toEqual([]);

        // Kökün yazı boyu tarayıcınınkidir: rem ölçüleri (dokunma alanı 2,75rem = 44 px) küçülmez.
        expect(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe(
          "16px",
        );
        expect((await alan.boundingBox())?.height).toBeGreaterThanOrEqual(44);
        expect((await dugme.boundingBox())?.height).toBeGreaterThanOrEqual(44);

        // Sayfa yana kaymaz.
        const kayma = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(kayma).toBe(0);
      });
    }
  }
}
