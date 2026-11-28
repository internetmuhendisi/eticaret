// Demo paketinin kuralları (kart 0345, karar 0203). Değerler sitelerde olmayan deneme değerleridir (para birimi XTS,
// vergi sınıfı "Deneme oranı"): çekirdekte site değeri arayan taramalar testleri de tarar: her paket kendi başına doğrulanır; paketi kullanan site parçaları
// paketten, değiştirdiklerini kendinden okur; uyuşmayan dil, para birimi, saat dilimi ve eksik vergi sınıfı, iki
// kaynakta birden duran parça, yazılı ama sitede olmayan parça ve olmayan paket durur.
import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { demoParcalari, magazaAdiniYerlestir } from "../../kayitlar/demo-paketi.ts";
import {
  demoKlasoru,
  demoPaketiniDogrula,
  demoTaniminiOku,
  siteKlasorunuDogrula,
} from "../site-klasoru.ts";

const demolar = join(import.meta.dirname, "..", "..", "demolar");

const tanim = {
  kod: "deneme-paketi",
  ad: "Deneme",
  sektor: "Deneme",
  aciklama: "Deneme paketi.",
  onizleme: "o.jpg",
  onerilenTema: "canli-carsi",
  dil: "tr",
  paraBirimi: "XTS",
  saatDilimi: "Europe/Istanbul",
  vergiSiniflari: ["Deneme oranı"],
};

const katalog = {
  kategoriler: [{ ad: "Paketten", adresAdi: "paketten" }],
  markalar: [],
  etiketler: [],
  urunler: [],
};

const yaz = (yol: string, icerik: unknown) => {
  mkdirSync(dirname(yol), { recursive: true });
  writeFileSync(yol, typeof icerik === "string" ? icerik : JSON.stringify(icerik));
};

// Deponun düzeni: <kök>/siteler/<site> ve <kök>/cekirdek/demolar/<paket>.
const kur = ({
  paket = {},
  paketDosyalari = {},
  ayarlar = {},
  siteDosyalari = {},
  paketsiz = false,
}: {
  paket?: Record<string, unknown>;
  paketDosyalari?: Record<string, unknown>;
  ayarlar?: Record<string, unknown>;
  siteDosyalari?: Record<string, unknown>;
  paketsiz?: boolean;
} = {}) => {
  const kok = mkdtempSync(join(tmpdir(), "demo-paketi-"));
  const site = join(kok, "siteler", "deneme");
  const paketKlasoru = join(kok, "cekirdek", "demolar", "deneme-paketi");
  if (!paketsiz) {
    yaz(join(paketKlasoru, "paket.json"), { ...tanim, ...paket });
    yaz(join(paketKlasoru, demoParcalari.gorseller, "o.jpg"), "x");
    yaz(join(paketKlasoru, demoParcalari.katalog), katalog);
    for (const [yol, icerik] of Object.entries(paketDosyalari))
      yaz(join(paketKlasoru, yol), icerik);
  }
  yaz(join(site, "kimlik.json"), {
    kodAdi: "deneme",
    gorunenAd: "Deneme Dükkanı",
    tur: "gercek",
    adresler: {},
    cekirdekSurumu: "1.0.0",
    teslimDurumu: { magazaSahibiHesabi: "bekliyor", yurtDisiAktarimBelgeleri: "bekliyor" },
  });
  yaz(join(site, "ayarlar.json"), {
    paraBirimi: "XTS",
    baslangicDemosu: "deneme-paketi",
    ...ayarlar,
  });
  yaz(join(site, "baslangic", "vergi.json"), {
    siniflar: [{ ad: "Deneme oranı", oranlar: [{ ulke: "TR", oran: "7" }] }],
  });
  for (const [yol, icerik] of Object.entries(siteDosyalari)) yaz(join(site, yol), icerik);
  return { site, paketKlasoru };
};

const hatalar = (sonuc: ReturnType<typeof siteKlasorunuDogrula>) =>
  sonuc.gecerli ? [] : sonuc.hatalar;

describe("cekirdek/demolar altındaki paketler", () => {
  const paketler = readdirSync(demolar, { withFileTypes: true }).filter((g) => g.isDirectory());

  it("en az bir paket var", () => {
    expect(paketler.map((p) => p.name)).toContain("demo1");
  });

  it.each(paketler.map((p) => [p.name]))("%s kendi başına doğrulamadan geçer", (ad) => {
    expect(demoPaketiniDogrula(join(demolar, ad))).toEqual([]);
  });
});

describe("paketin tanımı", () => {
  it("geçerli tanım okunur", () => {
    const { paketKlasoru } = kur();
    expect(demoTaniminiOku(paketKlasoru)).toMatchObject({ gecerli: true });
    expect(demoPaketiniDogrula(paketKlasoru)).toEqual([]);
  });

  it("klasörle uyuşmayan kod, olmayan önizleme, hazır olmayan tema ve şemaya uymayan alan reddedilir", () => {
    expect(demoPaketiniDogrula(kur({ paket: { kod: "baska" } }).paketKlasoru)[0]).toContain(
      "klasörün adıyla aynı",
    );
    expect(demoPaketiniDogrula(kur({ paket: { onizleme: "yok.jpg" } }).paketKlasoru)[0]).toContain(
      "onizleme",
    );
    expect(
      demoPaketiniDogrula(kur({ paket: { onerilenTema: "olmayan-tema" } }).paketKlasoru).join(),
    ).toContain("onerilenTema");
    expect(demoPaketiniDogrula(kur({ paket: { bilinmeyen: 1 } }).paketKlasoru)[0]).toContain(
      "paket.json",
    );
    expect(demoTaniminiOku(join(tmpdir(), "olmayan-paket"))).toEqual({
      gecerli: false,
      hatalar: ["paket yok."],
    });
  });

  it("mağaza adının yer tutucusu yalnız sayfalarda ve blogda geçer", () => {
    const sayfali = kur({
      paketDosyalari: {
        [demoParcalari.sayfalar]: [
          { baslik: "{magazaAdi}", adresAdi: "a", icerik: "{magazaAdi}", durum: "yayinda" },
        ],
      },
    });
    expect(demoPaketiniDogrula(sayfali.paketKlasoru)).toEqual([]);
    const katalogda = kur({
      paketDosyalari: {
        [demoParcalari.katalog]: {
          ...katalog,
          kategoriler: [{ ad: "{magazaAdi} seçkisi", adresAdi: "secki" }],
        },
      },
    });
    expect(demoPaketiniDogrula(katalogda.paketKlasoru)[0]).toContain("yalnız sayfalarda ve blogda");
  });

  it("paketin bozuk parçası paketin yeriyle söylenir", () => {
    const { paketKlasoru } = kur({
      paketDosyalari: { [demoParcalari.katalog]: { ...katalog, kategoriler: [{ ad: "" }] } },
    });
    expect(demoPaketiniDogrula(paketKlasoru)[0]).toContain(demoParcalari.katalog);
  });
});

describe("paketi kullanan site", () => {
  it("parçalar paketten gelir", () => {
    const sonuc = siteKlasorunuDogrula(kur().site);
    expect(hatalar(sonuc)).toEqual([]);
    expect(sonuc.gecerli && sonuc.site.katalogBaslangici.kategoriler.map((k) => k.ad)).toEqual([
      "Paketten",
    ]);
  });

  it("paketin yeri site klasörünün iki üstündeki cekirdek/demolar", () => {
    const { site, paketKlasoru } = kur();
    expect(demoKlasoru(site, "deneme-paketi")).toBe(paketKlasoru);
  });

  it("değiştirilen parça siteden gelir, öteki parçalar paketten", () => {
    const sonuc = siteKlasorunuDogrula(
      kur({
        ayarlar: { demoParcasiSiteden: ["katalog"] },
        siteDosyalari: {
          [demoParcalari.katalog]: {
            ...katalog,
            kategoriler: [{ ad: "Siteden", adresAdi: "siteden" }],
          },
        },
      }).site,
    );
    expect(hatalar(sonuc)).toEqual([]);
    expect(sonuc.gecerli && sonuc.site.katalogBaslangici.kategoriler.map((k) => k.ad)).toEqual([
      "Siteden",
    ]);
  });

  it("paketteki parça sitede de varsa, yazılı parça sitede yoksa durur", () => {
    expect(
      hatalar(
        siteKlasorunuDogrula(kur({ siteDosyalari: { [demoParcalari.katalog]: katalog } }).site),
      ),
    ).toContainEqual(expect.stringContaining("paketinde; sitede de olamaz"));
    expect(
      hatalar(siteKlasorunuDogrula(kur({ ayarlar: { demoParcasiSiteden: ["menuler"] } }).site)),
    ).toContainEqual(expect.stringContaining("demoParcasiSiteden'de yazılı ama sitede yok"));
  });

  it("demosuz sitede değiştirilen parça yazılmaz, olmayan paket durur", () => {
    expect(
      hatalar(
        siteKlasorunuDogrula(
          kur({ ayarlar: { baslangicDemosu: undefined, demoParcasiSiteden: ["duzen"] } }).site,
        ),
      ),
    ).toContainEqual(expect.stringContaining("başlangıç demosu yokken"));
    expect(hatalar(siteKlasorunuDogrula(kur({ paketsiz: true }).site))).toContainEqual(
      "demo paketi deneme-paketi: paket yok.",
    );
  });

  it("dili, para birimi ya da saat dilimi farklı paket ve sitede olmayan vergi sınıfı durur", () => {
    expect(
      hatalar(siteKlasorunuDogrula(kur({ ayarlar: { paraBirimi: "EUR" } }).site)),
    ).toContainEqual(expect.stringContaining("paraBirimi değeri XTS, sitenin EUR"));
    expect(
      hatalar(siteKlasorunuDogrula(kur({ ayarlar: { saatDilimi: "Europe/Berlin" } }).site)),
    ).toContainEqual(expect.stringContaining("saatDilimi"));
    // Bugün tek dil var (tr): başka dil yazan paketin tanımı geçmez, site de onunla başlayamaz.
    expect(hatalar(siteKlasorunuDogrula(kur({ paket: { dil: "en" } }).site))).toContainEqual(
      expect.stringMatching(/^demo paketi deneme-paketi: paket\.json: dil:/),
    );
    expect(
      hatalar(
        siteKlasorunuDogrula(
          kur({ paket: { vergiSiniflari: ["Deneme oranı", "Eksik sınıf"] } }).site,
        ),
      ),
    ).toContainEqual(
      expect.stringContaining('"Eksik sınıf" vergi sınıfını kullanıyor, sitede yok'),
    );
  });

  it("paketin parçasının hatası paketin yeriyle söylenir", () => {
    const sonuc = siteKlasorunuDogrula(
      kur({
        paketDosyalari: { [demoParcalari.katalog]: { ...katalog, kategoriler: [{ ad: "" }] } },
      }).site,
    );
    expect(hatalar(sonuc)[0]).toMatch(
      /^cekirdek\/demolar\/deneme-paketi\/baslangic\/katalog\.json/,
    );
  });
});

describe("mağaza adının yerleşmesi", () => {
  it("her yer tutucuya ad konur, adın işaretleri yorumlanmaz", () => {
    expect(magazaAdiniYerlestir("{magazaAdi} ve {magazaAdi}", "A$&B")).toBe("A$&B ve A$&B");
    expect(magazaAdiniYerlestir("yer tutucu yok", "X")).toBe("yer tutucu yok");
  });
});

describe("paketin parçalarının bozuk örnekleri", () => {
  const paketHatasi = (dosyalar: Record<string, unknown>) =>
    demoPaketiniDogrula(kur({ paketDosyalari: dosyalar }).paketKlasoru).join("\n");

  it("her parçanın kendi denetimi pakette çalışır", () => {
    expect(
      paketHatasi({ [demoParcalari.duzen]: { "ana-sayfa": [{ tur: "olmayan-bolum" }] } }),
    ).toContain(demoParcalari.duzen);
    expect(
      paketHatasi({
        [demoParcalari.menuler]: [
          {
            kod: "ana",
            ad: "Ana",
            tur: "elle",
            ogeler: [{ hedef: { tur: "kategori", adresAdi: "yok" } }],
          },
        ],
      }),
    ).toContain(demoParcalari.menuler);
    expect(paketHatasi({ [demoParcalari.kuponlar]: [{ kod: "" }] })).toContain(
      demoParcalari.kuponlar,
    );
    expect(
      paketHatasi({ [demoParcalari.blog]: { kategoriler: [{ ad: "" }], yazilar: [] } }),
    ).toContain(demoParcalari.blog);
    expect(
      paketHatasi({
        [demoParcalari.katalog]: {
          ...katalog,
          kategoriler: [{ ad: "Görselli", adresAdi: "gorselli", gorsel: "olmayan.jpg" }],
        },
      }),
    ).toContain("olmayan.jpg");
  });

  it("düzenin blog bölümünün kategorisi paketin blogunda olmalı", () => {
    const duzen = {
      "ust-kisim": [],
      "ana-sayfa": [{ tur: "blog-yazilari", degerler: { baslik: "Blogdan", kategori: "olmayan" } }],
      "alt-kisim": [],
    };
    const blog = { kategoriler: [{ ad: "Rehber", adresAdi: "rehber" }], yazilar: [] };
    expect(
      demoPaketiniDogrula(
        kur({ paketDosyalari: { [demoParcalari.duzen]: duzen, [demoParcalari.blog]: blog } })
          .paketKlasoru,
      ).join(),
    ).toContain("bu adres adıyla blog kategorisi yok");
  });

  // Önizleme yolu var olan dosyaya gitse de görsel adı kalıbına uymalı (kart 0347 onu panelde gösterecek).
  it("dil ve saat dilimi tanımda zorunlu, önizleme görsel adı kalıbında", () => {
    const { dil: _dil, ...dilsiz } = tanim;
    const k1 = kur();
    writeFileSync(join(k1.paketKlasoru, "paket.json"), JSON.stringify(dilsiz));
    expect(demoPaketiniDogrula(k1.paketKlasoru).join()).toContain("dil");
    const { saatDilimi: _saat, ...saatsiz } = tanim;
    const k2 = kur();
    writeFileSync(join(k2.paketKlasoru, "paket.json"), JSON.stringify(saatsiz));
    expect(demoPaketiniDogrula(k2.paketKlasoru).join()).toContain("saatDilimi");
    expect(
      demoPaketiniDogrula(kur({ paket: { onizleme: "../gorseller/o.jpg" } }).paketKlasoru).join(),
    ).toContain("onizleme");
  });
});

describe("yer tutucunun yeri ve sınırı", () => {
  const sayfa = (ek: Record<string, unknown>) => ({
    baslik: "Hakkımızda",
    adresAdi: "a",
    icerik: "",
    durum: "yayinda",
    ...ek,
  });

  it("blog kategorisinde ve yazının öteki alanlarında kullanılmaz", () => {
    const kategori = kur({
      paketDosyalari: {
        [demoParcalari.blog]: {
          kategoriler: [{ ad: "{magazaAdi} rehberi", adresAdi: "r" }],
          yazilar: [],
        },
      },
    });
    expect(demoPaketiniDogrula(kategori.paketKlasoru).join()).toContain("kategoriler");
    const yazar = kur({
      paketDosyalari: {
        [demoParcalari.blog]: {
          kategoriler: [],
          yazilar: [
            { baslik: "B", adresAdi: "b", icerik: "", yazar: "{magazaAdi}", durum: "taslak" },
          ],
        },
      },
    });
    expect(demoPaketiniDogrula(yazar.paketKlasoru).join()).toContain(
      "yalnız başlıkta, özette ve içerikte",
    );
  });

  it("en uzun mağaza adıyla sınırı aşan alan pakette, sitenin adıyla aşan sitede reddedilir", () => {
    const uzun = "{magazaAdi} ".padEnd(150, "x");
    expect(
      demoPaketiniDogrula(
        kur({ paketDosyalari: { [demoParcalari.sayfalar]: [sayfa({ baslik: uzun })] } })
          .paketKlasoru,
      ).join(),
    ).toContain("alanın sınırı aşılıyor");
    // Sitenin kısa adıyla (Deneme Dükkanı) aynı başlık sığar.
    expect(
      hatalar(
        siteKlasorunuDogrula(
          kur({ paketDosyalari: { [demoParcalari.sayfalar]: [sayfa({ baslik: uzun })] } }).site,
        ),
      ),
    ).toEqual([]);
  });

  it("sitenin değiştirdiği parçada da denetlenir", () => {
    expect(
      hatalar(
        siteKlasorunuDogrula(
          kur({
            ayarlar: { demoParcasiSiteden: ["kuponlar"] },
            siteDosyalari: { [demoParcalari.kuponlar]: [{ kod: "{magazaAdi}" }] },
          }).site,
        ),
      ),
    ).toContainEqual(expect.stringContaining("yalnız sayfalarda ve blogda"));
  });

  it("içeriğe ad HTML'de kaçırılarak girer", () => {
    expect(magazaAdiniYerlestir("<p>{magazaAdi}</p>", 'Moda<3 & "Ev"', { html: true })).toBe(
      "<p>Moda&#60;3 &#38; &#34;Ev&#34;</p>",
    );
  });
});
