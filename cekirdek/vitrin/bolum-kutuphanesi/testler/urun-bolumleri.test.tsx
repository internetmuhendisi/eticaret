// @vitest-environment jsdom
// Ürün bölümleri (kart 0111, karar 0088) çizilerek: kartlar yalnız bağlamdaki kaynaktan, sırasıyla; ürünü olmayan
// bölüm, sekme ve fırsat kartı çizilmez; kart görünümü bölümün seçimi ya da temanınki; yan afiş başlığıyla.
// Fırsatlarda her kartın kalan süresi ve panelin sayacı indirimin bitişinden; bitişi geçen kart kalkar, hepsi
// geçince bölüm çizilmez (sabit saatle). Marka logolarında logo ya da markanın adı, markanın sayfasına
// bağlı; silinen marka görünmez. Katalog örnekleri tariften geçer.

import { resolve } from "node:path";
import { act, render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import {
  ornekBaglam,
  ornekKaynaklar,
  ornekMarkaKimligi,
  ornekUrunBolumleri,
  ornekUrunBolumleriOtekiGorunumler,
} from "../../../katalog/ornek-baglam.ts";
import { ornekUrunKartlari } from "../../../katalog/ornek-urun-kartlari.ts";
import { urunKartiGorunumleri } from "../../../kayitlar/tema.ts";
import { MetinSaglayici } from "../../../metinler/istemci-metni.tsx";
import { kalanSure, sonrakiDegisim } from "../../bolumler/firsatlar/sure.ts";
import { firsatlar } from "../../bolumler/firsatlar/tarif.ts";
import { kartGorunumuAlani } from "../../bolumler/ortak/urun-alanlari.ts";
import { DuzenAlaniCizimi } from "../../duzen-alani.tsx";
import type { UrunKartiVerisi } from "../../urun-karti/tur.ts";
import type { VitrinBaglami } from "../baglam.ts";
import { type BolumOrnegi, bolumuDenetle } from "../duzen.ts";
import { bolumGorunumleri } from "../gorunumler.tsx";
import { bolumKutuphanesi } from "../kutuphane.ts";
import { bolumunUrunKaynaklari } from "../tarif.ts";
import { type UrunKaynagi, urunKaynagiAnahtari } from "../urun-kaynagi.ts";

beforeAll(() => {
  (globalThis as Record<symbol, unknown>)[Symbol.for("cekirdek.calisanSite")] = siteKlasorunuOku(
    resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler/gecerli"),
  );
});
afterEach(() => {
  vi.useRealTimers();
});

let sira = 0;
const bolum = (tur: string, gorunum: string, degerler: Record<string, unknown>): BolumOrnegi => {
  sira += 1;
  return { kimlik: `b-${sira}`, tur, gorunum, gizli: false, degerler };
};

const ogeler = (bolumler: BolumOrnegi[], baglam: VitrinBaglami) => (
  <MetinSaglayici dil="tr">
    <DuzenAlaniCizimi bolumler={bolumler} gorunumler={bolumGorunumleri} baglam={baglam} />
  </MetinSaglayici>
);
const ciz = (bolumler: BolumOrnegi[], baglam: VitrinBaglami) => {
  const kap = document.createElement("div");
  kap.innerHTML = renderToStaticMarkup(ogeler(bolumler, baglam));
  return kap;
};

const an = new Date("2030-01-15T12:00:00Z");
const dakikaSonra = (dakika: number) => new Date(an.getTime() + dakika * 60_000);
// Bağlamda yalnız verilen kaynaklar olsun.
const baglamIle = (urunler: Record<string, readonly UrunKartiVerisi[]>): VitrinBaglami => ({
  ...ornekBaglam(an),
  urunler,
});
const kartAdlari = (kap: ParentNode) =>
  [...kap.querySelectorAll("article h3, [data-gorunum] h3")].map((ad) => ad.textContent);
// Örnek kartlar metinleri çalışan siteden okur: site beforeAll'da kurulur.
let kartlar: UrunKartiVerisi[] = [];
beforeAll(() => {
  kartlar = ornekUrunKartlari();
});
const yeni: UrunKaynagi = { tur: "yeni", adet: 8 };
const firsatKaynagi = (adet: number): UrunKaynagi => ({ tur: "firsat", adet });
const bitisli = (kart: UrunKartiVerisi | undefined, bitis: Date): UrunKartiVerisi => {
  if (kart?.fiyat === undefined) throw new Error("Fiyatlı kart yok.");
  return { ...kart, fiyat: { ...kart.fiyat, indirimBitisi: bitis } };
};

describe("tarifler ve katalog örnekleri", () => {
  it("katalogdaki örnekler bölüm kütüphanesinin kurallarından geçer", () => {
    for (const ornek of [...ornekUrunBolumleri(), ...ornekUrunBolumleriOtekiGorunumler()]) {
      const sonuc = bolumuDenetle(bolumKutuphanesi, "ana-sayfa", ornek, [], { baslangic: false });
      expect(sonuc, `${ornek.tur} ${ornek.gorunum}`).not.toHaveProperty("sorunlar");
    }
  });

  it("dört bölüm yalnız ana sayfaya konur; kart görünümü seçenekleri kayıtla aynı", () => {
    for (const tur of ["urun-vitrini", "sekmeli-vitrin", "firsatlar", "marka-logolari"]) {
      expect(bolumKutuphanesi[tur]?.duzenAlanlari).toEqual(["ana-sayfa"]);
    }
    expect(kartGorunumuAlani.secenekler.map((secenek) => secenek.kod)).toEqual([
      "tema",
      ...urunKartiGorunumleri,
    ]);
  });

  it("fırsatların adetleri seçeneklerle aynı; kaynağı seçilen adettir, verilmezse varsayılan", () => {
    const adetAlani = firsatlar.alanlar.adet;
    expect(Object.keys(firsatlar.firsatAdedi.adetler)).toEqual(
      adetAlani.secenekler.map((secenek) => secenek.kod),
    );
    expect(bolumunUrunKaynaklari(firsatlar, {})).toEqual([{ tur: "firsat", adet: 2 }]);
    expect(bolumunUrunKaynaklari(firsatlar, { adet: "sekiz" })).toEqual([
      { tur: "firsat", adet: 8 },
    ]);
  });

  it("sekmeli vitrinin her sekmesinin kaynağı toplanır", () => {
    const tarif = bolumKutuphanesi["sekmeli-vitrin"];
    if (tarif === undefined) throw new Error("Tarif yok.");
    expect(
      bolumunUrunKaynaklari(tarif, {
        sekmeler: [
          { baslik: "Bir", urunler: yeni },
          { baslik: "İki", urunler: { tur: "indirimli", adet: 4 } },
        ],
      }),
    ).toEqual([yeni, { tur: "indirimli", adet: 4 }]);
  });
});

describe("ürün vitrini", () => {
  it("kartlar kaynağın kartları, sırasıyla; Tümünü gör ve yan afiş", () => {
    const baglam = baglamIle({ [urunKaynagiAnahtari(yeni)]: kartlar.slice(0, 3) });
    const kap = ciz(
      [
        bolum("urun-vitrini", "izgara", {
          baslik: "Öne çıkanlar",
          urunler: yeni,
          tumuBaglantisi: { adres: "/tumu", yeniSekme: false },
          yanBaslik: "Yan afiş",
          yanDugmeYazisi: "Git",
          yanBaglanti: { adres: "/yan", yeniSekme: false },
        }),
      ],
      baglam,
    );
    const bolumOgesi = kap.querySelector("section");
    expect(bolumOgesi?.querySelector("h2")?.textContent).toBe("Öne çıkanlar");
    expect(bolumOgesi?.getAttribute("aria-labelledby")).toBe(bolumOgesi?.querySelector("h2")?.id);
    expect(kartAdlari(kap)).toEqual(kartlar.slice(0, 3).map((kart) => kart.ad));
    expect(kap.querySelector('a[href="/tumu"]')?.textContent).toBe("Tümünü gör");
    expect(kap.textContent).toContain("Yan afiş");
    expect(kap.querySelector('a[href="/yan"]')?.textContent).toBe("Git");
  });

  it("yan afiş başlıksız çizilmez; kart görünümü bölümün seçimi, yoksa temanınki", () => {
    const baglam = baglamIle({ [urunKaynagiAnahtari(yeni)]: kartlar.slice(0, 2) });
    const tema = ciz([bolum("urun-vitrini", "izgara", { urunler: yeni, yanMetin: "x" })], baglam);
    expect(tema.textContent).not.toContain("x");
    expect(
      [...tema.querySelectorAll("[data-gorunum]")].map((kart) => kart.getAttribute("data-gorunum")),
    ).toEqual(["dikey", "dikey"]);
    const yatay = ciz(
      [bolum("urun-vitrini", "kaydirmali", { urunler: yeni, kartGorunumu: "yatay" })],
      { ...baglam, parcaGorunumleri: { "urun-karti": "buyuk-gorsel" } },
    );
    expect(
      [...yatay.querySelectorAll("[data-gorunum]")].map((kart) =>
        kart.getAttribute("data-gorunum"),
      ),
    ).toEqual(["yatay", "yatay"]);
    const temaninki = ciz([bolum("urun-vitrini", "izgara", { urunler: yeni })], {
      ...baglam,
      parcaGorunumleri: { "urun-karti": "buyuk-gorsel" },
    });
    expect(temaninki.querySelector("[data-gorunum]")?.getAttribute("data-gorunum")).toBe(
      "buyuk-gorsel",
    );
  });

  it("ürünü olmayan bölüm çizilmez", () => {
    const kap = ciz(
      [
        bolum("urun-vitrini", "izgara", { baslik: "Boş", urunler: yeni }),
        bolum("urun-vitrini", "izgara", { baslik: "Yok", urunler: { tur: "indirimli", adet: 4 } }),
      ],
      baglamIle({ [urunKaynagiAnahtari(yeni)]: [] }),
    );
    expect(kap.querySelector("section")).toBeNull();
  });
});

describe("sekmeli vitrin", () => {
  const indirimli: UrunKaynagi = { tur: "indirimli", adet: 4 };
  const marka: UrunKaynagi = { tur: "marka", marka: ornekMarkaKimligi(0), adet: 4 };

  it("ürünü olmayan sekme görünmez; seçili sekmenin kartları çizilir", () => {
    const kap = ciz(
      [
        bolum("sekmeli-vitrin", "izgara", {
          baslik: "Kategoriye göre",
          sekmeler: [
            { baslik: "Yeni", urunler: yeni },
            { baslik: "Boş", urunler: indirimli },
            { baslik: "Marka", urunler: marka },
          ],
        }),
      ],
      baglamIle({
        [urunKaynagiAnahtari(yeni)]: kartlar.slice(0, 2),
        [urunKaynagiAnahtari(indirimli)]: [],
        [urunKaynagiAnahtari(marka)]: kartlar.slice(4, 5),
      }),
    );
    expect([...kap.querySelectorAll('[role="tab"]')].map((sekme) => sekme.textContent)).toEqual([
      "Yeni",
      "Marka",
    ]);
    expect(kap.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toBe("Yeni");
    expect(kartAdlari(kap)).toEqual(kartlar.slice(0, 2).map((kart) => kart.ad));
    expect(kap.querySelector("h2")?.textContent).toBe("Kategoriye göre");
  });

  it("tek sekme kalırsa sekme çizilmez, başlığı bölümün başlığıdır; hiçbiri yoksa bölüm yok", () => {
    const degerler = {
      sekmeler: [
        { baslik: "Yeni", urunler: yeni },
        { baslik: "Boş", urunler: indirimli },
      ],
    };
    const tek = ciz(
      [bolum("sekmeli-vitrin", "izgara", degerler)],
      baglamIle({ [urunKaynagiAnahtari(yeni)]: kartlar.slice(0, 1) }),
    );
    expect(tek.querySelector('[role="tab"]')).toBeNull();
    expect(tek.querySelector("h2")?.textContent).toBe("Yeni");
    expect(kartAdlari(tek)).toEqual([kartlar[0]?.ad]);
    expect(ciz([bolum("sekmeli-vitrin", "izgara", degerler)], baglamIle({})).innerHTML).toBe("");
  });
});

describe("geri sayımlı fırsatlar", () => {
  const firsatBaglami = (bitisler: Date[]) =>
    baglamIle({
      [urunKaynagiAnahtari(firsatKaynagi(2))]: bitisler.map((bitis, kacinci) =>
        bitisli(kartlar[[0, 3, 6][kacinci] ?? 0], bitis),
      ),
    });

  it("kalan süre gün, saat ve dakikayla; dakika yukarı yuvarlanır", () => {
    const simdi = an.getTime();
    expect(kalanSure(dakikaSonra(40).getTime(), simdi)).toEqual({ gun: 0, saat: 0, dakika: 40 });
    expect(kalanSure(dakikaSonra(2 * 24 * 60 + 5 * 60).getTime(), simdi)).toEqual({
      gun: 2,
      saat: 5,
      dakika: 0,
    });
    expect(kalanSure(simdi + 1, simdi)).toEqual({ gun: 0, saat: 0, dakika: 1 });
    expect(kalanSure(simdi, simdi)).toEqual({ gun: 0, saat: 0, dakika: 0 });
    expect(kalanSure(simdi - 5, simdi)).toEqual({ gun: 0, saat: 0, dakika: 0 });
  });

  it("saat yalnız bir sonraki değişimde kurulur: bir kartın dakikası azalınca ya da indirimi bitince", () => {
    const simdi = an.getTime();
    expect(sonrakiDegisim([simdi + 125_000], simdi)).toBe(5_000);
    expect(sonrakiDegisim([simdi + 120_000], simdi)).toBe(60_000);
    expect(sonrakiDegisim([simdi + 125_000, simdi + 61_000], simdi)).toBe(1_000);
    expect(sonrakiDegisim([simdi + 500], simdi)).toBe(500);
    expect(sonrakiDegisim([simdi, simdi - 10], simdi)).toBeUndefined();
    expect(sonrakiDegisim([], simdi)).toBeUndefined();
  });

  it("her kartın kalan süresi kendi bitişinden; panelin sayacı en yakın bitişe", () => {
    const kap = ciz(
      [bolum("firsatlar", "yan-panelli", { ustYazi: "Süreli", baslik: "Fırsatlar" })],
      firsatBaglami([dakikaSonra(40), dakikaSonra(2 * 24 * 60 + 5 * 60)]),
    );
    expect(kap.querySelector("h2")?.textContent).toBe("Fırsatlar");
    expect(kartAdlari(kap)).toEqual([kartlar[0]?.ad, kartlar[3]?.ad]);
    const sureler = [...kap.querySelectorAll("li p")].map((p) => p.textContent);
    expect(sureler).toEqual(["Bitmesine 40 dakika", "Bitmesine 2 gün 5 saat"]);
    // Sıfır olan küçük birim yazılmaz.
    const tam = ciz(
      [bolum("firsatlar", "panelsiz", {})],
      firsatBaglami([dakikaSonra(2 * 24 * 60), dakikaSonra(60)]),
    );
    expect([...tam.querySelectorAll("li p")].map((p) => p.textContent)).toEqual([
      "Bitmesine 2 gün",
      "Bitmesine 1 saat",
    ]);
    const sayac = kap.querySelector('[role="timer"]');
    expect(sayac?.getAttribute("aria-label")).toBe("Kalan süre");
    expect(sayac?.textContent).toBe("0gün0saat40dakika");
  });

  it("bitişi olmayan kart çizilmez; hiçbiri yoksa ya da hepsi bitmişse bölüm yok", () => {
    const suresiz = baglamIle({
      [urunKaynagiAnahtari(firsatKaynagi(2))]: [kartlar[0] ?? ornekUrunKartlari()[0]].flatMap(
        (kart) => (kart === undefined ? [] : [kart]),
      ),
    });
    expect(ciz([bolum("firsatlar", "panelsiz", {})], suresiz).innerHTML).toBe("");
    // Bitişli kartın yanındaki bitişsiz kart çizilmez.
    const karisik = baglamIle({
      [urunKaynagiAnahtari(firsatKaynagi(2))]: [
        bitisli(kartlar[0], dakikaSonra(30)),
        ...(kartlar[3] === undefined ? [] : [kartlar[3]]),
      ],
    });
    expect(kartAdlari(ciz([bolum("firsatlar", "panelsiz", {})], karisik))).toEqual([
      kartlar[0]?.ad,
    ]);
    expect(ciz([bolum("firsatlar", "panelsiz", {})], baglamIle({})).innerHTML).toBe("");
    expect(ciz([bolum("firsatlar", "panelsiz", {})], firsatBaglami([an])).innerHTML).toBe("");
  });

  it("sayfa açıkken bitişi geçen kart kalkar, sayaç sonrakine geçer; hepsi bitince bölüm kalkar", () => {
    vi.useFakeTimers({ now: an });
    const { container } = render(
      ogeler(
        [bolum("firsatlar", "yan-panelli", { baslik: "Fırsatlar" })],
        firsatBaglami([dakikaSonra(1), dakikaSonra(3)]),
      ),
    );
    expect(kartAdlari(container)).toHaveLength(2);
    expect(container.querySelector('[role="timer"]')?.textContent).toBe("0gün0saat1dakika");
    act(() => {
      vi.advanceTimersByTime(60_000 - 1);
    });
    expect(kartAdlari(container)).toHaveLength(2);
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(kartAdlari(container)).toEqual([kartlar[3]?.ad]);
    expect(container.querySelector('[role="timer"]')?.textContent).toBe("0gün0saat2dakika");
    // React yeni zamanlayıcıyı act bittikten sonra kurar: saat dakika dakika ilerler.
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(container.querySelector('[role="timer"]')?.textContent).toBe("0gün0saat1dakika");
    expect(container.querySelector("section")).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(container.querySelector("section")).toBeNull();
  });

  it("arka plandaki sekme görünür olunca saat hemen tazelenir, biten kart kalkar", () => {
    vi.useFakeTimers({ now: an });
    const { container } = render(
      ogeler(
        [bolum("firsatlar", "panelsiz", {})],
        firsatBaglami([dakikaSonra(1), dakikaSonra(30)]),
      ),
    );
    expect(kartAdlari(container)).toHaveLength(2);
    // Zamanlayıcı çalışmadan saat ilerler (arka plandaki sekme), sonra sekme görünür olur.
    vi.setSystemTime(dakikaSonra(2));
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(kartAdlari(container)).toEqual([kartlar[3]?.ad]);
  });

  it("katalogdaki kaynak örneği de fırsat kaynağıdır", () => {
    expect(ornekKaynaklar.firsat2).toEqual(firsatKaynagi(2));
  });
});

describe("marka logoları", () => {
  it("logolu markada logo (adı alternatif metin), logosuzda adı; markanın sayfasına bağlı", () => {
    const baglam = ornekBaglam(an);
    const kap = ciz(
      [
        bolum("marka-logolari", "izgara", {
          markalar: [0, 2].map((kacinci) => ({ marka: ornekMarkaKimligi(kacinci) })),
        }),
      ],
      baglam,
    );
    const [logolu, logosuz] = [ornekMarkaKimligi(0), ornekMarkaKimligi(2)].map(
      (kimlik) => baglam.markalar[kimlik],
    );
    const baglantilar = [...kap.querySelectorAll("li a")];
    expect(baglantilar.map((a) => a.getAttribute("href"))).toEqual([logolu?.adres, logosuz?.adres]);
    expect(baglantilar[0]?.querySelector("img")?.getAttribute("alt")).toBe(logolu?.ad);
    expect(baglantilar[1]?.querySelector("img")).toBeNull();
    expect(baglantilar[1]?.textContent).toBe(logosuz?.ad);
  });

  it("bağlamda olmayan (silinmiş) marka görünmez; hiçbiri yoksa bölüm yok", () => {
    const baglam = ornekBaglam(an);
    const kap = ciz(
      [
        bolum("marka-logolari", "izgara", {
          markalar: [{ marka: ornekMarkaKimligi(1) }, { marka: ornekMarkaKimligi(99) }],
        }),
      ],
      baglam,
    );
    expect(kap.querySelectorAll("li")).toHaveLength(1);
    expect(
      ciz(
        [bolum("marka-logolari", "kaydirmali", { markalar: [{ marka: ornekMarkaKimligi(99) }] })],
        baglam,
      ).innerHTML,
    ).toBe("");
  });
});
