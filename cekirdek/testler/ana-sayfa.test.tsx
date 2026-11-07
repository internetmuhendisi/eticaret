// Vitrinin ana sayfası: "Yakında açılıyoruz." yazısı yalnız ayarı açık sitede görünür (kart 0041).
// Sayfa sunucuda çizilir (react-dom/server); çalışan site, sürecin ortak alanına konarak verilir.
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { siteKlasorunuOku } from "../ayar-semasi/site-klasoru.ts";
import { MetinSaglayici } from "../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../metinler/metin.ts";
import VitrinAnaSayfa from "../uygulama/app/page.tsx";

const ortak = globalThis as Record<symbol, unknown>;
const anahtar = Symbol.for("cekirdek.calisanSite");
const site = siteKlasorunuOku(
  resolve(import.meta.dirname, "../ayar-semasi/testler/ornek-siteler/gecerli"),
);
const yazi = metinOkuyucu("tr")("vitrin.anasayfa.yakindaAciliyoruz");

const ciz = (yakindaYazisi: boolean): string => {
  ortak[anahtar] = { ...site, ayarlar: { ...site.ayarlar, yakindaYazisi } };
  // Hesap alanı oturumu tarayıcıda sorar (kart 0033): sunucu çiziminde yer tutmaz.
  return renderToStaticMarkup(
    <MetinSaglayici dil="tr">
      <VitrinAnaSayfa />
    </MetinSaglayici>,
  );
};

describe("vitrinin ana sayfası", () => {
  afterEach(() => {
    delete ortak[anahtar];
  });

  it("ayar açıkken yazı başlığın hemen altında görünür", () => {
    expect(ciz(true)).toBe(`<main><h1>${site.kimlik.gorunenAd}</h1><p>${yazi}</p></main>`);
  });

  it("ayar kapalıyken yazı görünmez", () => {
    const sayfa = ciz(false);
    expect(sayfa).not.toContain(yazi);
    expect(sayfa).toBe(`<main><h1>${site.kimlik.gorunenAd}</h1></main>`);
  });

  it("ayar verilmemiş sitede varsayılan kapalıdır", () => {
    expect(site.ayarlar.yakindaYazisi).toBe(false);
  });
});
