// Yerel ortam denemesinin "vitrin kendi adını gösteriyor" ölçümü adı ana sayfanın başlığından okur (kart 0129).
// Ana sayfanın sunucuda çizdiği gerçek HTML ile: bölümsüz sade sayfada ve bölümlü sayfada (başlık yalnız ekran
// okuyucuda, sınıflı; kart 0110) aynı ad okunur. Komutların hiçbiri başlığı kendi kalıbıyla okumaz (kart 0208:
// yayın denemesi eski kalıpla boş ad okuyordu).
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { siteKlasorunuOku } from "../../cekirdek/ayar-semasi/site-klasoru.ts";
import { ornekAnaSayfa, ornekBaglam } from "../../cekirdek/katalog/ornek-baglam.ts";
import { MetinSaglayici } from "../../cekirdek/metinler/istemci-metni.tsx";
import { AnaSayfa, type AnaSayfaDuzeni } from "../../cekirdek/vitrin/ana-sayfa.tsx";
import { bolumGorunumleri } from "../../cekirdek/vitrin/bolum-kutuphanesi/gorunumler.tsx";
import { vitrinBasligi } from "../yerel-ortam.mts";

const ortak = globalThis as Record<symbol, unknown>;
const anahtar = Symbol.for("cekirdek.calisanSite");
const ad = "Deneme Dükkânı";

const ciz = (duzen?: AnaSayfaDuzeni) =>
  renderToStaticMarkup(
    <MetinSaglayici dil="tr">
      <AnaSayfa magazaAdi={ad} yakindaYazisi duzen={duzen} />
    </MetinSaglayici>,
  );

beforeAll(() => {
  ortak[anahtar] = siteKlasorunuOku(
    resolve(import.meta.dirname, "../../cekirdek/ayar-semasi/testler/ornek-siteler/gecerli"),
  );
});
afterAll(() => {
  delete ortak[anahtar];
});

describe("vitrin başlığı", () => {
  it("bölümsüz sade ana sayfada mağaza adını okur", () => {
    expect(vitrinBasligi(ciz())).toBe(ad);
  });

  it("bölümlü ana sayfada sınıflı başlıktan mağaza adını okur", () => {
    const govde = ciz({
      bolumler: ornekAnaSayfa(),
      gorunumler: bolumGorunumleri,
      baglam: ornekBaglam(),
    });
    expect(govde).toMatch(/<h1 class="/);
    expect(vitrinBasligi(govde)).toBe(ad);
  });

  it("başlık yoksa boş döner; h1 ile başlayan başka öğe başlık sayılmaz", () => {
    expect(vitrinBasligi("<main><p>ad</p></main>")).toBe("");
    expect(vitrinBasligi(`<h10>${ad}</h10>`)).toBe("");
  });

  it("komutlar başlığı yalnız bu işlevle okur, kendi h1 kalıbı yazmaz", () => {
    const klasor = resolve(import.meta.dirname, "..");
    const kendiKalibi = readdirSync(klasor)
      .filter((dosya) => dosya.endsWith(".mts") && dosya !== "yerel-ortam.mts")
      .filter((dosya) => /<h1|h1>/.test(readFileSync(join(klasor, dosya), "utf8")));
    expect(kendiKalibi).toEqual([]);
  });
});
