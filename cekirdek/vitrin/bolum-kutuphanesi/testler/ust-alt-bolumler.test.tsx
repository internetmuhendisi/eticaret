// @vitest-environment jsdom
// Üst ve alt kısım bölümlerinin görünüşleri (kart 0108, karar 0083) sunucuda çizilerek: içerik yalnız alan
// değerlerinden ve bağlamdan gelir; işlevi yazılmamış düğme görünmez, boş bilgi gösterilmez, olmayan menü bölümü
// boş bırakır, bölüm yoksa kısım hiç çizilmez. Tarayıcıdaki davranış (yan pencere, açılır menü, tarama)
// cekirdek/testler/uctan-uca/katalog.test.ts'tedir.
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it } from "vitest";
import { siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import { islevler } from "../../../kayitlar/islevler.ts";
import { MetinSaglayici } from "../../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../../metinler/metin.ts";
import { AltKisim, UstKisim } from "../../ust-alt-kisim.tsx";
import type { BaglamMenuDali, VitrinBaglami } from "../baglam.ts";
import { type BolumOrnegi, baslangicDuzeniSorunlari, bolumuDenetle } from "../duzen.ts";
import { bolumGorunumleri } from "../gorunumler.tsx";
import { bolumKutuphanesi } from "../kutuphane.ts";
import type { Kip } from "../tarif.ts";

const metin = metinOkuyucu("tr");

// Görünüşler metni çalışan sitenin dilinden okur.
beforeAll(() => {
  (globalThis as Record<symbol, unknown>)[Symbol.for("cekirdek.calisanSite")] = siteKlasorunuOku(
    resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler/gecerli"),
  );
});

const dal = (
  kimlik: string,
  adres: string | undefined,
  altlar: BaglamMenuDali[] = [],
): BaglamMenuDali => ({
  kimlik,
  metin: `metin-${kimlik}`,
  ...(adres === undefined ? {} : { adres }),
  yeniSekme: false,
  altlar,
});

const kapali = Object.fromEntries(
  islevler.map((islev) => [islev, false]),
) as VitrinBaglami["islevler"];
const acik = Object.fromEntries(
  islevler.map((islev) => [islev, true]),
) as VitrinBaglami["islevler"];

const bosBaglam: VitrinBaglami = {
  magazaAdi: "Deneme Dükkânı",
  iletisim: {},
  sosyalHesaplar: [],
  odemeIsaretleri: [],
  menuler: {},
  islevler: kapali,
  gorseller: {},
  kategoriler: {},
  markalar: {},
  urunler: {},
  an: new Date("2026-01-01T00:00:00Z"),
  yerTutucular: {},
  parcaGorunumleri: { "urun-karti": "dikey" },
  sayilar: {},
  yil: "2026",
};

let sira = 0;
const bolum = (
  tur: string,
  gorunum: string,
  degerler: Record<string, unknown> = {},
): BolumOrnegi => {
  sira += 1;
  return { kimlik: `b-${sira}`, tur, gorunum, gizli: false, degerler };
};

const ust = (bolumler: BolumOrnegi[], baglam: VitrinBaglami = bosBaglam) =>
  renderToStaticMarkup(
    <MetinSaglayici dil="tr">
      <UstKisim bolumler={bolumler} gorunumler={bolumGorunumleri} baglam={baglam} />
    </MetinSaglayici>,
  );
const alt = (bolumler: BolumOrnegi[], baglam: VitrinBaglami = bosBaglam) =>
  renderToStaticMarkup(
    <MetinSaglayici dil="tr">
      <AltKisim bolumler={bolumler} gorunumler={bolumGorunumleri} baglam={baglam} />
    </MetinSaglayici>,
  );

const belge = (html: string) => {
  const kap = document.createElement("div");
  kap.innerHTML = html;
  return kap;
};

describe("kısımlar", () => {
  it("bölüm yoksa üst ve alt kısım hiç çizilmez; varsa header ve footer içindedir", () => {
    expect(ust([])).toBe("");
    expect(alt([])).toBe("");
    expect(ust([bolum("ust-satir", "logo-solda")])).toMatch(/^<header/);
    expect(alt([bolum("telif-satiri", "duz")])).toMatch(/^<footer/);
  });
});

describe("logo ve simgeler satırı", () => {
  it("işlevi yazılmamış arama, favori ve sepet görünmez; hesap görünür; logo yoksa mağaza adı yazılır", () => {
    const kap = belge(ust([bolum("ust-satir", "logo-solda")]));
    const adlar = [...kap.querySelectorAll("a")].map((a) => a.textContent);
    expect(adlar).toContain("Deneme Dükkânı");
    expect(adlar).toContain(metin("vitrin.bolum.ustSatir.hesap"));
    for (const anahtar of ["arama", "favoriler", "sepet"] as const) {
      expect(adlar).not.toContain(metin(`vitrin.bolum.ustSatir.${anahtar}`));
    }
    expect(kap.querySelector("img")).toBeNull();
  });

  it("işlevler açıkken arama, favori ve sepet görünür, sayılar rozettedir; telefonda yalnız arama ve sepet satırdadır", () => {
    const kap = belge(
      ust([bolum("ust-satir", "logo-ortada")], {
        ...bosBaglam,
        islevler: acik,
        sayilar: { sepet: 2, favori: 0 },
        logoAdresi: "/kapi/herkese-acik/logo?s=ab",
      }),
    );
    const baglanti = (anahtar: "arama" | "favoriler" | "sepet" | "hesap") =>
      [...kap.querySelectorAll("a")].find((a) =>
        a.textContent?.includes(metin(`vitrin.bolum.ustSatir.${anahtar}`)),
      );
    expect(baglanti("arama")?.getAttribute("href")).toBe("/arama");
    expect(baglanti("sepet")?.textContent).toContain("2");
    // Sıfır sayı rozet göstermez.
    expect(baglanti("favoriler")?.textContent).toBe(metin("vitrin.bolum.ustSatir.favoriler"));
    for (const anahtar of ["favoriler", "hesap"] as const) {
      expect(baglanti(anahtar)?.className).toContain("hidden tablet:inline-flex");
    }
    for (const anahtar of ["arama", "sepet"] as const) {
      expect(baglanti(anahtar)?.className).not.toContain("hidden");
    }
    // Masaüstünde hesap ve sepet yazısıyla, sepet kenarlı bir hap içinde (Canlı Çarşı taslağı).
    for (const anahtar of ["hesap", "sepet"] as const) {
      expect(baglanti(anahtar)?.querySelector("span")?.className).toBe(
        "sr-only masaustu:not-sr-only",
      );
    }
    expect(baglanti("sepet")?.className).toContain(
      "masaustu:border masaustu:border-kenar masaustu:bg-yuzey",
    );
    expect(baglanti("hesap")?.className).not.toContain("masaustu:border");
    const logo = kap.querySelector("img");
    expect(logo?.getAttribute("alt")).toBe("Deneme Dükkânı");
    expect(logo?.getAttribute("src")).toBe("/kapi/herkese-acik/logo?s=ab");
  });

  it("menü düğmesi telefonda ve tablette görünür, masaüstünde gizlidir; logo ortadayken telefon numarası tablette görünür, logo soldayken satırda yoktur", () => {
    const solda = belge(
      ust([bolum("ust-satir", "logo-solda")], {
        ...bosBaglam,
        iletisim: { telefon: { metin: "+90 000", adres: "tel:+90000" } },
      }),
    );
    expect(solda.querySelector('a[href="tel:+90000"]')).toBeNull();
    const kap = belge(
      ust([bolum("ust-satir", "logo-ortada", { menuler: [{ menu: "ana-menu" }] })], {
        ...bosBaglam,
        iletisim: { telefon: { metin: "+90 000", adres: "tel:+90000" } },
        menuler: { "ana-menu": [dal("a", "/a")] },
      }),
    );
    const dugme = kap.querySelector("button");
    expect(dugme?.getAttribute("aria-label")).toBe(metin("vitrin.bolum.ustSatir.menuyuAc"));
    expect(dugme?.className).toContain("masaustu:hidden");
    const telefon = kap.querySelector('a[href="tel:+90000"]');
    expect(telefon?.className).toContain("hidden");
    expect(telefon?.className).toContain("tablet:inline-flex");
  });
});

describe("menü satırı", () => {
  const baglam: VitrinBaglami = {
    ...bosBaglam,
    menuler: {
      "ana-menu": [
        dal("a", "/a"),
        dal("b", "/b", [dal("b1", "/b1")]),
        dal("c", undefined, [dal("c1", "/c1")]),
      ],
      kategoriler: [dal("k", "/kategori/k")],
    },
  };

  it("alt düzeyi olmayan dal bağlantıdır, olan dal açılır düğmedir; kategori menüsü düğmenin altındadır; masaüstünde görünür", () => {
    const kap = belge(
      ust(
        [
          bolum("menu-satiri", "sola-yasli", {
            anaMenu: "ana-menu",
            kategoriMenusu: "kategoriler",
          }),
        ],
        baglam,
      ),
    );
    const nav = kap.querySelector("nav");
    expect(nav?.getAttribute("aria-label")).toBe(metin("vitrin.bolum.menuSatiri.gezinme"));
    expect(nav?.className).toContain("hidden");
    expect(nav?.className).toContain("masaustu:block");
    expect(
      [...kap.querySelectorAll("nav > ul > li")].map((li) => li.firstElementChild?.tagName),
    ).toEqual(["BUTTON", "A", "BUTTON", "BUTTON"]);
    expect(kap.querySelector("button")?.textContent).toBe(
      metin("vitrin.bolum.menuSatiri.kategoriler"),
    );
    expect(kap.querySelector('a[href="/a"]')?.textContent).toBe("metin-a");
    // Menü öğeleri arasında taslaktaki aralık (karar 0096).
    expect(kap.querySelector("nav > ul")?.className.split(" ")).toContain("gap-2");
  });

  it("olmayan ya da boş menüde bölüm çizilmez; kategori menüsü verilmezse düğmesi yoktur", () => {
    expect(
      belge(ust([bolum("menu-satiri", "ortali", { anaMenu: "yok" })], baglam)).querySelector("nav"),
    ).toBeNull();
    const kap = belge(ust([bolum("menu-satiri", "ortali", { anaMenu: "ana-menu" })], baglam));
    expect(kap.textContent).not.toContain(metin("vitrin.bolum.menuSatiri.kategoriler"));
    expect(kap.querySelector("ul")?.className).toContain("justify-center");
  });
});

describe("alt kısım", () => {
  const baglam: VitrinBaglami = {
    ...bosBaglam,
    menuler: {
      "alt-bilgi": [
        dal("s", undefined, [dal("s1", "/s1"), dal("s2", "/s2")]),
        dal("t", "/t", [dal("t1", "/t1")]),
        dal("u", "/u"),
      ],
    },
  };

  it("bağlantı sütunları: en üst öğe başlık, altları bağlantı; altsız bağlantılar ayrı listede; tek satır görünümü hepsini dizer", () => {
    const kap = belge(alt([bolum("baglanti-sutunlari", "sutunlu", { menu: "alt-bilgi" })], baglam));
    expect(
      [...kap.querySelectorAll("h2")].map((h) => [
        h.textContent,
        h.querySelector("a")?.getAttribute("href") ?? null,
      ]),
    ).toEqual([
      ["metin-s", null],
      ["metin-t", "/t"],
    ]);
    expect([...kap.querySelectorAll("li a")].map((a) => a.getAttribute("href"))).toEqual([
      "/s1",
      "/s2",
      "/t1",
      "/u",
    ]);
    const tek = belge(
      alt([bolum("baglanti-sutunlari", "tek-satir", { menu: "alt-bilgi" })], baglam),
    );
    expect([...tek.querySelectorAll("a")].map((a) => a.getAttribute("href"))).toEqual([
      "/s1",
      "/s2",
      "/t",
      "/t1",
      "/u",
    ]);
    expect(alt([bolum("baglanti-sutunlari", "sutunlu", { menu: "yok" })], baglam)).not.toContain(
      "<nav",
    );
  });

  it("iletişim bilgileri: boş olan gösterilmez, hiçbiri yoksa bölüm çizilmez; başlık verilmezse mağazanın adıdır, liste görünümü ikonsuzdur", () => {
    expect(alt([bolum("iletisim-bilgileri", "liste")])).not.toContain("<section");
    const kap = belge(
      alt([bolum("iletisim-bilgileri", "yatay", { baslik: "Bize ulaşın" })], {
        ...bosBaglam,
        iletisim: {
          eposta: { metin: "iletisim@ornek.test", adres: "mailto:iletisim@ornek.test" },
          adres: ["Deneme Sokak No: 1", "00000 İlçe / İl"],
        },
      }),
    );
    expect(kap.querySelector("h2")?.textContent).toBe("Bize ulaşın");
    expect(kap.querySelector('a[href^="tel:"]')).toBeNull();
    expect(kap.querySelector('a[href="mailto:iletisim@ornek.test"]')).not.toBeNull();
    expect([...kap.querySelectorAll("address span.block")].map((s) => s.textContent)).toEqual([
      "Deneme Sokak No: 1",
      "00000 İlçe / İl",
    ]);
    const ortak = belge(
      alt([bolum("iletisim-bilgileri", "liste")], {
        ...bosBaglam,
        iletisim: { telefon: { metin: "+90", adres: "tel:+90" } },
      }),
    );
    expect(ortak.querySelector("h2")?.textContent).toBe("Deneme Dükkânı");
    expect(ortak.querySelector("svg")).toBeNull();
    expect(kap.querySelector("svg")).not.toBeNull();
  });

  it("sosyal hesaplar: hesap yoksa çizilmez; varsa sitenin adıyla, yeni sekmede ve açtığı sayfaya erişim vermeden", () => {
    expect(alt([bolum("sosyal-hesaplar", "liste")])).not.toContain("<section");
    const kap = belge(
      alt([bolum("sosyal-hesaplar", "yatay")], {
        ...bosBaglam,
        sosyalHesaplar: [{ site: "tiktok", adres: "https://www.tiktok.com/@ornek" }],
      }),
    );
    const a = kap.querySelector("a");
    expect(a?.getAttribute("href")).toBe("https://www.tiktok.com/@ornek");
    expect(a?.getAttribute("target")).toBe("_blank");
    expect(a?.getAttribute("rel")).toBe("noopener noreferrer");
    expect(a?.textContent).toContain(metin("vitrin.bolum.sosyalHesaplar.site.tiktok"));
  });

  it("ödeme işaretleri: işaret yoksa çizilmez; yalnız işaret görünümünde ad yalnız ekran okuyucuya okunur", () => {
    expect(alt([bolum("odeme-isaretleri", "yazili")])).not.toContain("<section");
    const baglamli = { ...bosBaglam, odemeIsaretleri: ["havale", "kapida-odeme"] as const };
    const yazili = belge(
      alt([bolum("odeme-isaretleri", "yazili")], {
        ...baglamli,
        odemeIsaretleri: [...baglamli.odemeIsaretleri],
      }),
    );
    // Yazılı görünümde her yöntem kenarlı küçük bir yazıdır, ikonsuz (Canlı Çarşı taslağı).
    expect([...yazili.querySelectorAll("li")].map((li) => li.textContent)).toEqual([
      metin("vitrin.bolum.odemeIsaretleri.isaret.havale"),
      metin("vitrin.bolum.odemeIsaretleri.isaret.kapida-odeme"),
    ]);
    expect(yazili.querySelector("svg")).toBeNull();
    const isaret = belge(
      alt([bolum("odeme-isaretleri", "yalniz-isaret")], {
        ...baglamli,
        odemeIsaretleri: [...baglamli.odemeIsaretleri],
      }),
    );
    expect([...isaret.querySelectorAll("li span")].every((s) => s.className === "sr-only")).toBe(
      true,
    );
  });

  it("telif satırı: yıl ve mağaza adı bağlamdan, ek metin değerden; altyapı adı yalnız bağlamda varsa", () => {
    const kap = belge(alt([bolum("telif-satiri", "duz", { ekMetin: "Tüm hakları saklıdır." })]));
    expect(kap.textContent).toBe(
      `${metin("vitrin.bolum.telifSatiri.isaret")} 2026 Deneme Dükkânı Tüm hakları saklıdır.`,
    );
    const altyapili = belge(
      alt([bolum("telif-satiri", "duz")], { ...bosBaglam, altyapiAdi: "altyapi" }),
    );
    expect(altyapili.textContent).toContain(`${metin("vitrin.bolum.telifSatiri.altyapi")} altyapi`);
  });
});

describe("alt kısmın yerleşimi", () => {
  it("telif ve ödeme işaretleri çizgiyle ayrılan alt satırda, öteki bölümler ızgarada; her grup sırasını korur", () => {
    const kap = belge(
      alt(
        [
          bolum("telif-satiri", "duz"),
          bolum("iletisim-bilgileri", "liste"),
          bolum("odeme-isaretleri", "yazili"),
          bolum("sosyal-hesaplar", "liste"),
        ],
        {
          ...bosBaglam,
          iletisim: { telefon: { metin: "+90", adres: "tel:+90" } },
          sosyalHesaplar: [{ site: "x", adres: "https://x.com/ornek" }],
          odemeIsaretleri: ["havale"],
        },
      ),
    );
    const [izgara, altSatir] = [...(kap.querySelector("footer > div")?.children ?? [])];
    expect(izgara?.className).toContain("grid-cols-2");
    expect(izgara?.className).toContain("masaustu:grid-cols-5");
    expect([...(izgara?.children ?? [])].map((oge) => oge.getAttribute("aria-label"))).toEqual([
      metin("vitrin.bolum.iletisimBilgileri.ad"),
      metin("vitrin.bolum.sosyalHesaplar.baslik"),
    ]);
    expect(altSatir?.className).toContain("border-t");
    expect([...(altSatir?.children ?? [])].map((oge) => oge.tagName)).toEqual(["P", "SECTION"]);
  });

  it("bağlantı sütunları masaüstünde sütun sayısı kadar yer alır, daha dar ekranda sütunları ızgaraya tek tek yerleşir", () => {
    const baglam: VitrinBaglami = {
      ...bosBaglam,
      menuler: {
        iki: [dal("a", undefined, [dal("a1", "/a1")]), dal("b", undefined, [dal("b1", "/b1")])],
        uc: [
          dal("a", undefined, [dal("a1", "/a1")]),
          dal("b", "/b", [dal("b1", "/b1")]),
          dal("c", "/c"),
        ],
      },
    };
    const nav = (menu: string) =>
      belge(alt([bolum("baglanti-sutunlari", "sutunlu", { menu })], baglam)).querySelector("nav");
    expect(nav("iki")?.className).toContain("masaustu:col-span-2");
    expect(nav("uc")?.className).toContain("masaustu:col-span-3");
    expect(nav("uc")?.className).toContain("contents");
    expect(nav("uc")?.className).toContain("masaustu:grid-cols-subgrid");
  });
});

describe("duyuru şeridi", () => {
  it("metin, isteğe bağlı bağlantı ve okunur renk çifti; bilinmeyen renk alt kısım rengine düşer", () => {
    const kap = belge(
      ust([
        bolum("duyuru-seridi", "ortali", {
          metin: "Duyuru",
          baglanti: { adres: "https://ornek.test/a", yeniSekme: true },
          zemin: "birincil",
        }),
      ]),
    );
    const a = kap.querySelector("a");
    expect(a?.textContent).toBe("Duyuru");
    expect(a?.getAttribute("target")).toBe("_blank");
    expect(kap.querySelector("div")?.className).toContain("bg-birincil text-birincil-ustu");
    const bilinmeyen = belge(
      ust([bolum("duyuru-seridi", "ortali", { metin: "Duyuru", zemin: "yok" })]),
    );
    expect(bilinmeyen.querySelector("div")?.className).toContain(
      "bg-alt-kisim text-alt-kisim-ustu",
    );
    expect(bilinmeyen.querySelector("p")?.textContent).toBe("Duyuru");
  });

  it("iki yana görünümünde mağazanın telefonu sağda ve yalnız masaüstünde; ortalı görünümde telefon yok", () => {
    const baglam = {
      ...bosBaglam,
      iletisim: { telefon: { metin: "+90 000", adres: "tel:+90000" } },
    };
    const ikiYana = belge(ust([bolum("duyuru-seridi", "iki-yana", { metin: "Duyuru" })], baglam));
    const telefon = ikiYana.querySelector('a[href="tel:+90000"]');
    expect(telefon?.textContent).toBe("+90 000");
    expect(telefon?.className).toContain("hidden");
    expect(telefon?.className).toContain("masaustu:inline-flex");
    expect(ikiYana.querySelector("div > div")?.className).toContain("justify-between");
    const ortali = belge(ust([bolum("duyuru-seridi", "ortali", { metin: "Duyuru" })], baglam));
    expect(ortali.querySelector('a[href="tel:+90000"]')).toBeNull();
  });
});

describe("tarifler", () => {
  it("menü alanı kodla seçilir: başlangıç düzeninde de seçilebilir, kod biçimine uymayan değer geçmez", () => {
    const denetle = (anaMenu: unknown, kayit: Kip["kayit"]) =>
      bolumuDenetle(
        bolumKutuphanesi,
        "ust-kisim",
        { tur: "menu-satiri", gorunum: "ortali", degerler: { anaMenu } },
        [],
        { kayit },
      );
    for (const kayit of ["yok", "adres-adi", "kimlik"] as const) {
      expect(denetle("ana-menu", kayit)).toEqual({ degerler: { anaMenu: "ana-menu" } });
    }
    for (const bozuk of ["Ana Menü", "ana menu", "", 3]) {
      expect("sorunlar" in denetle(bozuk, "kimlik"), String(bozuk)).toBe(true);
    }
  });

  it("üst kısım bölümleri alt kısma, alt kısım bölümleri üst kısma konamaz", () => {
    const sorunlar = baslangicDuzeniSorunlari(
      {
        "ust-kisim": [{ tur: "telif-satiri", gizli: false, degerler: {} }],
        "ana-sayfa": [{ tur: "ust-satir", gizli: false, degerler: {} }],
        "alt-kisim": [{ tur: "duyuru-seridi", gizli: false, degerler: { metin: "a" } }],
      },
      bolumKutuphanesi,
      { kayit: "yok" },
    );
    expect(sorunlar.map((sorun) => [sorun.yer.join("."), sorun.kod])).toEqual([
      ["ust-kisim.0.tur", "bolum-alani-uygun-degil"],
      ["ana-sayfa.0.tur", "bolum-alani-uygun-degil"],
      ["alt-kisim.0.tur", "bolum-alani-uygun-degil"],
    ]);
  });
});
