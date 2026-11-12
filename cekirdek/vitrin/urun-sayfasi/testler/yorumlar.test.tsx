// @vitest-environment jsdom
// Ürün sayfasının yorum bölümü sunucuda çizilerek (kart 0139, karar 0109): puan özeti ve dağılım, yorum metninin
// yazı olarak çizilmesi (HTML çalışmaz, satır sonu korunur), doğrulanmış alıcı etiketinin ayarın iki değerinde,
// yorumsuz ürünün davetiyesi, "Daha fazla yorum" bağlantısı ve başlığın altındaki puan satırı.
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it } from "vitest";
import { siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import { MetinSaglayici } from "../../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../../metinler/metin.ts";
import type { PuanOzeti, VitrinYorumu } from "../../../moduller/yorum/servis.ts";
import { PuanSatiri, UrunYorumlari } from "../yorumlar.tsx";

const metin = metinOkuyucu("tr");
beforeAll(() => {
  (globalThis as Record<symbol, unknown>)[Symbol.for("cekirdek.calisanSite")] = siteKlasorunuOku(
    resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler/gecerli"),
  );
});

const yorum = (ek: Partial<VitrinYorumu> = {}): VitrinYorumu => ({
  kimlik: crypto.randomUUID(),
  puan: 4,
  metin: "Güzel ürün",
  ad: "Ayşe Y.",
  dogrulanmisAlici: false,
  zaman: new Date("2026-11-10T09:00:00Z"),
  ...ek,
});
const puan: PuanOzeti = { ortalama: 4.25, sayi: 4, dagilim: [2, 1, 0, 0, 1] };

const ciz = (ozellikler: Partial<Parameters<typeof UrunYorumlari>[0]> = {}) => {
  const kap = document.createElement("div");
  kap.innerHTML = renderToStaticMarkup(
    <MetinSaglayici dil="tr">
      <UrunYorumlari
        urun={crypto.randomUUID()}
        urunAdi="Deneme"
        puan={puan}
        liste={{ yorumlar: [yorum()], toplam: 1 }}
        dogrulanmisAliciEtiketi
        sonrakiAdres={undefined}
        {...ozellikler}
      />
    </MetinSaglayici>,
  );
  return kap;
};

describe("yorum bölümü", () => {
  it("puan özeti: ortalama sitenin biçimiyle, dağılım 5'ten 1'e ve ekran okuyucuda yazıyla", () => {
    const kap = ciz();
    expect(kap.textContent).toContain("4,3");
    const satirlar = [...kap.querySelectorAll("ul[aria-label] li .sr-only")].map(
      (s) => s.textContent,
    );
    expect(satirlar).toEqual([
      "5 yıldız: 2 yorum",
      "4 yıldız: 1 yorum",
      "3 yıldız: 0 yorum",
      "2 yıldız: 0 yorum",
      "1 yıldız: 1 yorum",
    ]);
  });

  it("yorum metni yazı olarak çizilir: HTML çalışmaz, satır sonu korunur", () => {
    const kap = ciz({
      liste: {
        yorumlar: [yorum({ metin: '<img src=x onerror="x()">\nikinci', baslik: "<b>B</b>" })],
        toplam: 1,
      },
    });
    expect(kap.querySelector("img")).toBeNull();
    expect(kap.querySelector("h3 b")).toBeNull();
    expect(kap.querySelector("h3")?.textContent).toBe("<b>B</b>");
    const paragraf = [...kap.querySelectorAll("p")].find((p) => p.textContent?.includes("ikinci"));
    expect(paragraf?.textContent).toBe('<img src=x onerror="x()">\nikinci');
    expect(paragraf?.className).toContain("whitespace-pre-line");
  });

  it("doğrulanmış alıcı etiketi yalnız ayar açıkken ve alıcı yorumunda görünür", () => {
    const etiket = metin("vitrin.yorum.dogrulanmisAlici");
    const alici = { liste: { yorumlar: [yorum({ dogrulanmisAlici: true })], toplam: 1 } };
    expect(ciz({ ...alici, dogrulanmisAliciEtiketi: true }).textContent).toContain(etiket);
    expect(ciz({ ...alici, dogrulanmisAliciEtiketi: false }).textContent).not.toContain(etiket);
    expect(ciz({ dogrulanmisAliciEtiketi: true }).textContent).not.toContain(etiket);
  });

  it("yorumsuz üründe davet yazısı, özet ve liste yok; düğme her zaman var", () => {
    const kap = ciz({ puan: undefined, liste: { yorumlar: [], toplam: 0 } });
    expect(kap.textContent).toContain(metin("vitrin.yorum.ilkYorum"));
    expect(kap.querySelector("ul")).toBeNull();
    expect(kap.textContent).toContain(metin("vitrin.yorum.yorumYaz"));
  });

  it("daha fazla yorum: toplam görülenden çoksa bağlantı, son sayfada bağlantısız durum yazısı", () => {
    const iki = { yorumlar: [yorum(), yorum()], toplam: 7 };
    const kap = ciz({ liste: iki, sonrakiAdres: "/urun/x?yorum-sayfasi=2#yorumlar" });
    const baglanti = [...kap.querySelectorAll("a")].find(
      (a) => a.textContent === metin("vitrin.yorum.dahaFazla"),
    );
    expect(baglanti?.getAttribute("href")).toBe("/urun/x?yorum-sayfasi=2#yorumlar");
    expect(kap.textContent).toContain("7 yorumun 2 tanesini gördünüz");
    const tumu = ciz({ liste: { yorumlar: [yorum()], toplam: 1 } });
    expect(tumu.textContent).not.toContain(metin("vitrin.yorum.dahaFazla"));
  });

  it("başlığın altındaki puan satırı yorumlara bağlanır; yorumsuz üründe 'henüz yorum yok'", () => {
    const kap = document.createElement("div");
    kap.innerHTML = renderToStaticMarkup(<PuanSatiri puan={puan} />);
    expect(kap.querySelector("a")?.getAttribute("href")).toBe("#yorumlar");
    expect(kap.querySelector("a")?.textContent).toBe("4 yorum");
    expect(kap.querySelectorAll(".fill-current")).toHaveLength(4);
    kap.innerHTML = renderToStaticMarkup(<PuanSatiri puan={undefined} />);
    expect(kap.querySelector("a")?.textContent).toBe(metin("vitrin.yorum.henuzYorumYok"));
    expect(kap.querySelectorAll(".fill-current")).toHaveLength(0);
  });
});
