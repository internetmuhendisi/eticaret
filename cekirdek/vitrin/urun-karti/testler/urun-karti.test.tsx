// @vitest-environment jsdom
// Ürün kartının görünüşü sunucuda çizilerek (kart 0109, karar 0085): görünüm temadan ya da bölümün
// seçiminden; tükenmiş üründe yalnız "Tükendi" rozeti, değilse indirim oranı ("...'e varan" birleşimlerin
// oranları farklıysa); görselsiz üründe yer tutucu; favori, sepet ve puan yalnız işlevleri açıkken (sepet
// tükenmiş ve fiyatsız üründe yok); ad iki satırda biter, bütün kart ürün sayfasına gider; eski fiyat ve
// indirimli fiyatın adı ekran okuyucuda. Tarayıcıdaki ölçümler (taşma, tarama, üç genişlik)
// cekirdek/testler/uctan-uca/katalog.test.ts'tedir.
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it } from "vitest";
import { siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import { urunKartiGorunumleri } from "../../../kayitlar/tema.ts";
import { metinOkuyucu } from "../../../metinler/metin.ts";
import type { GosterilecekFiyat } from "../../../moduller/fiyat/gosterim.ts";
import { urunKartiGorunumu } from "../gorunum.ts";
import type { UrunKartiVerisi } from "../tur.ts";
import { UrunKarti, type UrunKartiIslevleri } from "../urun-karti.tsx";

const metin = metinOkuyucu("tr");

beforeAll(() => {
  (globalThis as Record<symbol, unknown>)[Symbol.for("cekirdek.calisanSite")] = siteKlasorunuOku(
    resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler/gecerli"),
  );
});

const tutar = (kurus: number, eski?: number): GosterilecekFiyat => ({
  tutar: kurus,
  ...(eski === undefined ? {} : { eskiTutar: eski }),
  indirimde: eski !== undefined,
  paraBirimi: "XTS",
  vergi: "vergi-dahil",
  ekMetin: "Vergiler dahil",
  yazili: { tutar: `T${kurus}`, ...(eski === undefined ? {} : { eskiTutar: `E${eski}` }) },
});

const urun = (degisiklik: Partial<UrunKartiVerisi> = {}): UrunKartiVerisi => ({
  kimlik: "u1",
  ad: "Deneme ürünü",
  adres: "/urun/deneme",
  marka: "Deneme markası",
  gorsel: {
    alternatifMetin: "Mavi kupa",
    kaynaklar: [
      { adres: "/g?o=1&b=kucuk", genislik: 160 },
      { adres: "/g?o=1&b=orta", genislik: 480 },
    ],
    genislik: 480,
    yukseklik: 360,
  },
  fiyat: { enDusuk: tutar(1000), enYuksek: tutar(1000), tek: true, yaziliAralik: "A1000-1000" },
  tukendi: false,
  ...degisiklik,
});

const tekFiyat = {
  enDusuk: tutar(1000),
  enYuksek: tutar(1000),
  tek: true,
  yaziliAralik: "A1000-1000",
};

const kapali: UrunKartiIslevleri = { favori: false, sepet: false, yorum: false };
const acik: UrunKartiIslevleri = { favori: true, sepet: true, yorum: true };

const ciz = (
  veri: UrunKartiVerisi,
  islevler: UrunKartiIslevleri = kapali,
  gorunum: (typeof urunKartiGorunumleri)[number] = "dikey",
) => {
  const kap = document.createElement("div");
  kap.innerHTML = renderToStaticMarkup(
    <UrunKarti urun={veri} gorunum={gorunum} islevler={islevler} />,
  );
  const kart = kap.querySelector("article");
  if (kart === null) throw new Error("Kart çizilmedi.");
  return kart;
};

const rozetler = (kart: Element) =>
  [...kart.querySelectorAll('[data-slot="rozet"]')].map((rozet) => rozet.textContent);

describe("görünüm", () => {
  it("bölümün seçimi temanınkinden önce gelir; kayıtta olmayan seçim yok sayılır", () => {
    expect(urunKartiGorunumu({ "urun-karti": "yatay" })).toBe("yatay");
    expect(urunKartiGorunumu({ "urun-karti": "yatay" }, "buyuk-gorsel")).toBe("buyuk-gorsel");
    expect(urunKartiGorunumu({ "urun-karti": "yatay" }, "olmayan")).toBe("yatay");
    expect(urunKartiGorunumu({ "urun-karti": "eski" })).toBe(urunKartiGorunumleri[0]);
    expect(urunKartiGorunumu({})).toBe(urunKartiGorunumleri[0]);
  });

  it.each(urunKartiGorunumleri)(
    "%s görünümünde ad, marka, fiyat, görsel ve bağlantı",
    (gorunum) => {
      const kart = ciz(urun(), kapali, gorunum);
      expect(kart.getAttribute("data-gorunum")).toBe(gorunum);
      const baglanti = kart.querySelector("h3 a");
      expect(baglanti?.getAttribute("href")).toBe("/urun/deneme");
      expect(baglanti?.textContent).toBe("Deneme ürünü");
      // Ad iki satırda üç noktayla biter; bağlantı bütün kartın üstüne yayılır.
      expect(baglanti?.className).toContain("line-clamp-2");
      expect(baglanti?.className).toContain("after:inset-0");
      // Yatay kart taslaktaki kompakt karttır: marka yok.
      if (gorunum === "yatay") expect(kart.textContent).not.toContain("Deneme markası");
      else expect(kart.textContent).toContain("Deneme markası");
      expect(kart.querySelector("strong")?.textContent).toBe("T1000");
      const gorsel = kart.querySelector("img");
      expect(gorsel?.getAttribute("alt")).toBe("Mavi kupa");
      expect(gorsel?.getAttribute("srcset")).toBe("/g?o=1&b=kucuk 160w, /g?o=1&b=orta 480w");
      expect([gorsel?.getAttribute("width"), gorsel?.getAttribute("height")]).toEqual([
        "480",
        "360",
      ]);
      expect(gorsel?.getAttribute("loading")).toBe("lazy");
    },
  );
});

describe("rozet", () => {
  it("indirim oranı; birleşimlerin oranları farklıysa varan indirim", () => {
    expect(
      rozetler(ciz(urun({ fiyat: { ...tekFiyat, indirim: { oran: 24, varan: false } } }))),
    ).toEqual(["%24 indirim"]);
    expect(
      rozetler(ciz(urun({ fiyat: { ...tekFiyat, indirim: { oran: 30, varan: true } } }))),
    ).toEqual(["%30'a varan indirim"]);
    expect(
      rozetler(ciz(urun({ fiyat: { ...tekFiyat, indirim: { oran: 50, varan: true } } }))),
    ).toEqual(["%50'ye varan indirim"]);
    expect(rozetler(ciz(urun()))).toEqual([]);
  });

  it("tükenmiş üründe yalnız Tükendi; indirim rozeti çıkmaz", () => {
    const kart = ciz(
      urun({ tukendi: true, fiyat: { ...tekFiyat, indirim: { oran: 24, varan: false } } }),
    );
    expect(rozetler(kart)).toEqual([metin("vitrin.stok.tukendi")]);
  });
});

describe("fiyat", () => {
  it("indirimli fiyat indirim renginde, eski fiyat üstü çizili; ikisinin adı ekran okuyucuda", () => {
    const kart = ciz(
      urun({
        fiyat: {
          enDusuk: tutar(750, 1000),
          enYuksek: tutar(750, 1000),
          tek: true,
          yaziliAralik: "A750-750",
        },
      }),
    );
    expect(kart.querySelector("strong")?.className).toContain("text-indirim");
    expect(kart.querySelector("s")?.textContent).toBe("E1000");
    const okunan = [...kart.querySelectorAll(".sr-only")].map((oge) => oge.textContent);
    expect(okunan).toEqual(
      expect.arrayContaining([
        metin("vitrin.fiyat.indirimliFiyat"),
        metin("vitrin.fiyat.eskiFiyat"),
      ]),
    );
    expect(kart.textContent).toContain("Vergiler dahil");
  });

  it("aralıkta iki uç yazılır, eski fiyat yazılmaz", () => {
    const kart = ciz(
      urun({
        fiyat: {
          enDusuk: tutar(750, 1000),
          enYuksek: tutar(2000),
          tek: false,
          yaziliAralik: "A750-2000",
        },
      }),
    );
    expect(kart.querySelector("strong")?.textContent).toBe("A750-2000");
    expect(kart.querySelector("s")).toBeNull();
  });

  // Bağımsız kontrolün bulgusu: iki ucun tutarı aynı ama biri indirimdeyse "150,00 – 150,00" yazılmazdı.
  it("uçlar aynı tutardaysa tek tutar yazılır, eski fiyat yazılmaz", () => {
    const kart = ciz(
      urun({
        fiyat: {
          enDusuk: tutar(1500, 2000),
          enYuksek: tutar(1500),
          tek: false,
          yaziliAralik: "A1500-1500",
        },
      }),
    );
    expect(kart.querySelector("strong")?.textContent).toBe("T1500");
    expect(kart.querySelector("s")).toBeNull();
  });

  it("fiyatı olmayan üründe fiyat yok", () => {
    const { fiyat: _, ...fiyatsiz } = urun();
    expect(ciz(fiyatsiz).querySelector('[data-slot="fiyat"]')).toBeNull();
  });
});

describe("görsel ve işlevler", () => {
  it("görseli olmayan üründe yer tutucu ikon, img yok", () => {
    const { gorsel: _, ...gorselsiz } = urun();
    const kart = ciz(gorselsiz);
    expect(kart.querySelector("img")).toBeNull();
    expect(kart.querySelector("svg")).not.toBeNull();
  });

  it("işlevler kapalıyken favori, sepet ve puan yok; açıkken görünür", () => {
    const puanli = urun({ puan: { ortalama: 3.6, sayi: 12 } });
    expect(ciz(puanli, kapali).querySelectorAll("button")).toHaveLength(0);
    expect(ciz(puanli, kapali).querySelector('[data-slot="puan"]')).toBeNull();
    const kart = ciz(puanli, acik);
    const adlar = [...kart.querySelectorAll("button")].map((d) => d.getAttribute("aria-label"));
    // Klavye sırası: ürünün adı, sepete ekle, favori.
    expect(adlar).toEqual([
      metin("vitrin.urunKarti.sepeteEkle"),
      metin("vitrin.urunKarti.favoriyeEkle"),
    ]);
    // Puan beş yıldızdır (taslak): ortalama 3,6 yuvarlanır, dördü dolu.
    const puan = kart.querySelector('[data-slot="puan"]');
    expect(puan?.querySelectorAll("svg")).toHaveLength(5);
    expect(puan?.querySelectorAll("svg.fill-current")).toHaveLength(4);
    expect(puan?.textContent).toBe("5 üzerinden 3,6 puan, 12 değerlendirme");
    // Puanı olmayan üründe beşi boş, ekran okuyucuda "Henüz puan yok".
    const puansiz = ciz(urun(), acik).querySelector('[data-slot="puan"]');
    expect(puansiz?.querySelectorAll("svg.fill-current")).toHaveLength(0);
    expect(puansiz?.textContent).toBe(metin("vitrin.urunKarti.puanYok"));
    // Yatay kartta puan yok (taslağın kompakt kartı).
    expect(ciz(puanli, acik, "yatay").querySelector('[data-slot="puan"]')).toBeNull();
  });

  it("yatay kartta rozet yok, tükenmiş ürün fiyatın altında yazıyla", () => {
    const indirimli = urun({ fiyat: { ...tekFiyat, indirim: { oran: 24, varan: false } } });
    expect(rozetler(ciz(indirimli, kapali, "yatay"))).toEqual([]);
    const tukenmis = ciz(urun({ tukendi: true }), kapali, "yatay");
    expect(rozetler(tukenmis)).toEqual([]);
    expect(tukenmis.lastElementChild?.lastElementChild?.textContent).toBe(
      metin("vitrin.stok.tukendi"),
    );
  });

  it("tükenmiş ve fiyatsız üründe sepete ekle yok, favori var", () => {
    const { fiyat: _, ...fiyatsiz } = urun();
    for (const veri of [urun({ tukendi: true }), fiyatsiz]) {
      const adlar = [...ciz(veri, acik).querySelectorAll("button")].map((d) =>
        d.getAttribute("aria-label"),
      );
      expect(adlar).toEqual([metin("vitrin.urunKarti.favoriyeEkle")]);
    }
  });
});
