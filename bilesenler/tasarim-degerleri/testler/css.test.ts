// Sayfaya yazılan tasarım değerleri (kart 0102, karar 0076): her değer açık ve koyu temada yazılır,
// şemaya uymayan değer sayfaya hiç yazılmaz.
import { describe, expect, it } from "vitest";
import { temaDegerleriCss } from "../css.ts";
import {
  keskinCizgiDegerleri,
  renkAdlari,
  type TemaDegerleri,
  varsayilanTemaDegerleri,
  yumusakMevsimDegerleri,
} from "../degerler.ts";

const degistir = (degisiklik: (kopya: TemaDegerleri) => void) => {
  const kopya = structuredClone(varsayilanTemaDegerleri);
  degisiklik(kopya);
  return kopya;
};

describe("tema değerlerinin CSS'i", () => {
  const css = temaDegerleriCss(varsayilanTemaDegerleri);

  it("her renk açık temada :root'ta, koyu temada koyu tema tercihinde yazılır", () => {
    const [acik, koyu] = css.split(/@media \(prefers-color-scheme:dark\)|:root\[data-renk=acik\]/);
    for (const ad of renkAdlari) {
      expect(acik).toContain(`--renk-${ad}:${varsayilanTemaDegerleri.renkler.acik[ad]};`);
      expect(koyu).toContain(`--renk-${ad}:${varsayilanTemaDegerleri.renkler.koyu[ad]};`);
    }
    expect(acik).toContain("color-scheme:light dark;");
  });

  // Bileşen kataloğu (kart 0104) temayı cihazdan bağımsız seçer: öznitelikli kök iki temanın değerlerini
  // de taşır, cihazın tercihinden sonra ve daha özgül seçiciyle yazılır.
  it("kökteki tema özniteliği açık ya da koyu temayı cihazın tercihinden bağımsız seçer", () => {
    const tercih = css.indexOf("@media (prefers-color-scheme:dark)");
    const zorlananAcik = css.match(/:root\[data-renk=acik\]\{([^}]*)\}/);
    const zorlananKoyu = css.match(/:root\[data-renk=koyu\]\{([^}]*)\}/);
    expect(zorlananAcik?.index ?? -1).toBeGreaterThan(tercih);
    expect(zorlananKoyu?.index ?? -1).toBeGreaterThan(tercih);
    expect(zorlananAcik?.[1]).toContain("color-scheme:light;");
    expect(zorlananKoyu?.[1]).toContain("color-scheme:dark;");
    for (const ad of renkAdlari) {
      expect(zorlananAcik?.[1]).toContain(
        `--renk-${ad}:${varsayilanTemaDegerleri.renkler.acik[ad]};`,
      );
      expect(zorlananKoyu?.[1]).toContain(
        `--renk-${ad}:${varsayilanTemaDegerleri.renkler.koyu[ad]};`,
      );
    }
  });

  it("HTML ya da başka CSS kuralı yazılabilecek karakter yoktur", () => {
    expect(css).not.toMatch(/[<>"'\\]/);
  });

  it.each<[string, (kopya: TemaDegerleri) => void]>([
    ["kısa renk", (k) => (k.renkler.acik.zemin = "#FFF")],
    ["adlı renk", (k) => (k.renkler.koyu.yazi = "red")],
    ["kuraldan kaçan renk", (k) => (k.renkler.acik.zemin = "#FFFFFF;}body{display:none")],
    ["etiketten kaçan yazı tipi", (k) => (k.yaziTipleri.govde = "Inter</style><script>")],
    ["tırnaklı yazı tipi", (k) => (k.yaziTipleri.baslik = "'Jost', sans-serif")],
    ["birimsiz köşe", (k) => (k.koseler.orta = "8")],
    ["kuraldan kaçan gölge", (k) => (k.golgeler.acik.kart = "none;}*{color:red")],
    ["ölçü olmayan yazı boyu", (k) => (k.yaziBoylari.govde.boy = "calc(1rem + 1vw)")],
    ["eksik renk", (k) => Reflect.deleteProperty(k.renkler.acik, "zemin")],
    ["tanımsız renk", (k) => Object.assign(k.renkler.acik, { kirmizi: "#FF0000" })],
    // Kart 0124: bağlı renkler, başlık biçimi, tema boşlukları ve ürün sütunu.
    ["tanımsız renge bağ", (k) => (k.renkBaglari.rozet = "mor")],
    ["kuraldan kaçan bağlı renk", (k) => (k.renkBaglari.rozet = "#FFD43B;}body{display:none")],
    ["eksik bağ", (k) => Reflect.deleteProperty(k.renkBaglari, "vurgu-yazi")],
    ["temada eksik bağ", (k) => (k.renkBaglari["rozet-ustu"] = { acik: "yazi" } as never)],
    ["tanımsız başlık dönüşümü", (k) => (k.baslikBicimi.donusum = "capitalize" as never)],
    ["piksel harf aralığı", (k) => (k.baslikBicimi.harfAraligi = "2px")],
    ["kuraldan kaçan harf aralığı", (k) => (k.baslikBicimi.harfAraligi = "0.02em;}*{color:red")],
    ["kuraldan kaçan tema boşluğu", (k) => (k.bosluklar.bolum = "3rem;}*{color:red")],
    ["sınır dışı ürün sütunu", (k) => (k.urunSutunu = 9)],
    ["ondalıklı ürün sütunu", (k) => (k.urunSutunu = 4.5)],
    [
      "kuraldan kaçan ikinci gölge katmanı",
      (k) => (k.golgeler.acik.kart = "0 1px 3px rgb(0 0 0 / 0.1), none;}*{color:red"),
    ],
  ])("%s sayfaya yazılmaz", (_ad, bozma) => {
    expect(() => temaDegerleriCss(degistir(bozma))).toThrow();
  });
});

// Kart 0124: bağlı renk bağlandığı rengin değişkenini okur (mağaza sahibinin ana rengi değişince o da değişir),
// kendi rengi olan aynen yazılır; bağ açık ve koyu temada ayrı olabilir.
describe("bağlı renkler ve temanın biçim değerleri", () => {
  const bloklar = (css: string) => {
    const [acik = "", koyu = ""] = css.split(
      /@media \(prefers-color-scheme:dark\)|:root\[data-renk=acik\]/,
    );
    return { acik, koyu };
  };

  it("ana renge bağlı rozet ana rengin değişkenini okur, vurgu yazı rengindedir (Canlı Çarşı)", () => {
    const { acik, koyu } = bloklar(temaDegerleriCss(varsayilanTemaDegerleri));
    for (const blok of [acik, koyu]) {
      expect(blok).toContain("--renk-rozet:var(--renk-birincil);");
      expect(blok).toContain("--renk-rozet-ustu:var(--renk-birincil-ustu);");
      expect(blok).toContain("--renk-vurgu-yazi:var(--renk-yazi);");
      expect(blok).toContain("--renk-kart-kenari:var(--renk-kenar);");
    }
  });

  it("kendi rengi olan bağlı renk aynen, temaya göre ayrı bağ kendi temasında yazılır (Keskin Çizgi)", () => {
    const { acik, koyu } = bloklar(temaDegerleriCss(keskinCizgiDegerleri));
    expect(acik).toContain("--renk-rozet:#FFD43B;");
    expect(koyu).toContain("--renk-rozet:#FFD43B;");
    expect(acik).toContain("--renk-rozet-ustu:var(--renk-yazi);");
    expect(koyu).toContain("--renk-rozet-ustu:var(--renk-zemin);");
    expect(acik).toContain("--renk-vurgu-yazi:var(--renk-birincil);");
  });

  it("başlık biçimi, tema boşlukları ve ürün sütunu yazılır", () => {
    const yumusak = temaDegerleriCss(yumusakMevsimDegerleri);
    expect(yumusak).toContain("--baslik-donusumu:none;");
    expect(yumusak).toContain("--baslik-harf-araligi:-0.01em;");
    expect(yumusak).toContain("--bosluk-kart-ici:1rem;");
    expect(yumusak).toContain("--bosluk-bolum:3.5rem;");
    expect(yumusak).toContain("--bosluk-bolum-masaustu:5rem;");
    expect(yumusak).toContain("--urun-sutunu:4;");
    expect(yumusak).toContain(
      "--golge-kart:0 1px 3px rgb(35 33 30 / 0.08), 0 6px 18px rgb(35 33 30 / 0.05);",
    );
    const keskin = temaDegerleriCss(keskinCizgiDegerleri);
    expect(keskin).toContain("--baslik-donusumu:uppercase;");
    expect(keskin).toContain("--baslik-harf-araligi:0.02em;");
    expect(keskin).toContain("--bosluk-bolum-masaustu:3.5rem;");
  });
});
