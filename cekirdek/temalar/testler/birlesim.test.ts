// Sitenin tasarım değerleri (kart 0102, karar 0076): şemaya uymayan değer sayfaya yazılmaz, site
// düşmez; hata bir kez kaydedilir ve sayfa başlangıç değerleriyle açılır.
import { afterEach, describe, expect, it } from "vitest";
import { temaDegerleriCss } from "../../../bilesenler/tasarim-degerleri/css.ts";
import { varsayilanTemaDegerleri } from "../../../bilesenler/tasarim-degerleri/degerler.ts";
import { hataIzlemeAraciniBagla, type IzlenenHata } from "../../izleme/hata-katmani.ts";
import { sitenTasarimCss } from "../birlesim.ts";

const izlenenler: IzlenenHata[] = [];
hataIzlemeAraciniBagla((olay) => izlenenler.push(olay));
afterEach(() => {
  izlenenler.length = 0;
});

describe("sitenin tasarım CSS'i", () => {
  it("geçerli değerler olduğu gibi yazılır, hata kaydedilmez", () => {
    expect(sitenTasarimCss()).toBe(temaDegerleriCss(varsayilanTemaDegerleri));
    expect(izlenenler).toEqual([]);
  });

  it("bozuk değer sayfaya yazılmaz: başlangıç değerleri yazılır, hata bir kez kaydedilir", () => {
    const bozuk = structuredClone(varsayilanTemaDegerleri);
    bozuk.koseler.orta = "0;}body{display:none";
    const css = sitenTasarimCss(bozuk);
    expect(css).toBe(temaDegerleriCss(varsayilanTemaDegerleri));
    expect(css).not.toContain("display:none");
    expect(izlenenler).toHaveLength(1);
    expect(izlenenler[0]?.baglam).toMatchObject({ kaynak: "tasarim-degerleri" });
  });
});
