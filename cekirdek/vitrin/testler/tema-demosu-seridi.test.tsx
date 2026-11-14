// @vitest-environment jsdom
// Tema demosunun şeridi (kart 0116, kullanıcı kararı): demo olduğunu ve alışveriş yapılamadığını söyler, sitenin
// temaları arasında geçiş verir. Bağlantı yalnız tema parametresidir (bulunulan sayfada kalınır) ve sayfayı baştan
// yükleyen düz bağlantıdır.
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it } from "vitest";
import { siteKlasorunuOku } from "../../ayar-semasi/site-klasoru.ts";
import { temaDemosu } from "../../kayitlar/tema.ts";
import { metinOkuyucu } from "../../metinler/metin.ts";
import { TemaDemosuSeridi } from "../tema-demosu-seridi.tsx";

const metin = metinOkuyucu("tr");
const site = siteKlasorunuOku(
  resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler/tema-demosu"),
);

beforeAll(() => {
  (globalThis as Record<symbol, unknown>)[Symbol.for("cekirdek.calisanSite")] = site;
});

const ciz = (secili: string) => {
  const kap = document.createElement("div");
  kap.innerHTML = renderToStaticMarkup(<TemaDemosuSeridi temalar={site.temalar} secili={secili} />);
  return kap;
};

describe("tema demosunun şeridi", () => {
  it("demo olduğunu ve alışveriş yapılamadığını söyleyen adlı bölgedir", () => {
    const bolge = ciz("canli-carsi").querySelector("section");
    expect(bolge?.getAttribute("aria-label")).toBe(metin("vitrin.temaDemosu.seritAdi"));
    expect(bolge?.textContent).toContain(metin("vitrin.temaDemosu.aciklama"));
    expect(bolge?.querySelector("nav")?.getAttribute("aria-label")).toBe(
      metin("vitrin.temaDemosu.temalar"),
    );
  });

  it("sitenin her teması adıyla ve kendi tema parametresiyle; yalnız seçili tema işaretli", () => {
    const kap = ciz("yumusak-mevsim");
    const baglantilar = [...kap.querySelectorAll("a")];
    expect(baglantilar.map((a) => a.getAttribute("href"))).toEqual(
      site.temalar.map((tema) => `?${temaDemosu.parametre}=${tema.kod}`),
    );
    expect(baglantilar.map((a) => a.textContent)).toEqual([
      metin("tema.ad.canliCarsi"),
      metin("tema.ad.yumusakMevsim"),
      metin("tema.ad.keskinCizgi"),
    ]);
    expect(
      baglantilar
        .filter((a) => a.getAttribute("aria-current") === "true")
        .map((a) => a.textContent),
    ).toEqual([metin("tema.ad.yumusakMevsim")]);
    // Bağlantı parmakla rahat basılır (44 px).
    for (const a of baglantilar) expect(a.getAttribute("class")).toContain("min-h-11");
  });
});
