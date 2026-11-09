// Sayfaya yazılan tasarım değerleri (kart 0102, karar 0076): her değer açık ve koyu temada yazılır,
// şemaya uymayan değer sayfaya hiç yazılmaz.
import { describe, expect, it } from "vitest";
import { temaDegerleriCss } from "../css.ts";
import { renkAdlari, type TemaDegerleri, varsayilanTemaDegerleri } from "../degerler.ts";

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
  ])("%s sayfaya yazılmaz", (_ad, bozma) => {
    expect(() => temaDegerleriCss(degistir(bozma))).toThrow();
  });
});
