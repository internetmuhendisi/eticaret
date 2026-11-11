// Vitrin listelerinin filtre kuralları (kart 0136, karar 0102): grup içinde "veya", gruplar arası "ve"; seçenekler
// aynı birimde ve "stoktakiler"le o birimin stoğunda; fiyat sınırları dahil, fiyatsız ürün uymaz; seçeneğin
// sayısı o grupta yalnız o seçenek seçilmiş gibidir; fiyat sıralamasında fiyatsız sonda, eşitlikte gelen sıra.
import { describe, expect, it } from "vitest";
import {
  bosFiltre,
  type FiltreAdayi,
  filtreBosMu,
  filtreyeUyarMi,
  fiyataGoreSirala,
  secenekSayisi,
  type UrunFiltresi,
} from "../filtre.ts";

const aday = (kimlik: string, ek: Partial<FiltreAdayi> = {}): FiltreAdayi => ({
  kimlik,
  stokta: true,
  birimler: [{ stokta: true, degerler: {} }],
  ozellikler: {},
  ...ek,
});
const filtre = (ek: Partial<UrunFiltresi>): UrunFiltresi => ({ ...bosFiltre(), ...ek });

// Tişört: M-siyah stokta, M-beyaz tükenmiş, S-beyaz stokta.
const tisort = aday("tisort", {
  marka: "orn",
  fiyat: 29_990,
  ozellikler: { kumas: "pamuk" },
  birimler: [
    { stokta: true, degerler: { beden: "m", renk: "siyah" } },
    { stokta: false, degerler: { beden: "m", renk: "beyaz" } },
    { stokta: true, degerler: { beden: "s", renk: "beyaz" } },
  ],
});
// Gömlek: yalnız L-beyaz, tükenmiş.
const gomlek = aday("gomlek", {
  marka: "baska",
  fiyat: 79_990,
  stokta: false,
  ozellikler: { kumas: "keten" },
  birimler: [{ stokta: false, degerler: { beden: "l", renk: "beyaz" } }],
});
// Çanta: basit ürün, markasız, fiyatsız.
const canta = aday("canta");
const hepsi = [tisort, gomlek, canta];
const uyanlar = (f: UrunFiltresi) => hepsi.filter((a) => filtreyeUyarMi(a, f)).map((a) => a.kimlik);

describe("filtreye uyma", () => {
  it("boş filtre herkesi geçirir", () => {
    expect(filtreBosMu(bosFiltre())).toBe(true);
    expect(uyanlar(bosFiltre())).toEqual(["tisort", "gomlek", "canta"]);
  });

  it("marka: grup içinde veya; markasız ürün uymaz", () => {
    expect(uyanlar(filtre({ markalar: ["orn"] }))).toEqual(["tisort"]);
    expect(uyanlar(filtre({ markalar: ["orn", "baska"] }))).toEqual(["tisort", "gomlek"]);
  });

  it("seçenekler aynı birimde aranır, gruplar arası ve", () => {
    expect(uyanlar(filtre({ secenekler: { beden: ["m"] } }))).toEqual(["tisort"]);
    expect(uyanlar(filtre({ secenekler: { renk: ["beyaz"] } }))).toEqual(["tisort", "gomlek"]);
    expect(uyanlar(filtre({ secenekler: { beden: ["l"], renk: ["siyah"] } }))).toEqual([]);
    // S-siyah birimi yok: S ve siyah ayrı birimlerdedir.
    expect(uyanlar(filtre({ secenekler: { beden: ["s"], renk: ["siyah"] } }))).toEqual([]);
    expect(uyanlar(filtre({ secenekler: { beden: ["s", "l"], renk: ["beyaz"] } }))).toEqual([
      "tisort",
      "gomlek",
    ]);
  });

  it("stoktakiler: seçenek yoksa ürünün stoğu, seçenek varsa o birimin stoğu", () => {
    expect(uyanlar(filtre({ stoktakiler: true }))).toEqual(["tisort", "canta"]);
    // M-beyaz tükenmiş, M-siyah stokta.
    expect(uyanlar(filtre({ stoktakiler: true, secenekler: { beden: ["m"] } }))).toEqual([
      "tisort",
    ]);
    expect(
      uyanlar(filtre({ stoktakiler: true, secenekler: { beden: ["m"], renk: ["beyaz"] } })),
    ).toEqual([]);
    expect(uyanlar(filtre({ secenekler: { beden: ["m"], renk: ["beyaz"] } }))).toEqual(["tisort"]);
  });

  it("özellik: değeri olmayan ürün uymaz", () => {
    expect(uyanlar(filtre({ ozellikler: { kumas: ["keten"] } }))).toEqual(["gomlek"]);
    expect(uyanlar(filtre({ ozellikler: { kumas: ["keten", "pamuk"] } }))).toEqual([
      "tisort",
      "gomlek",
    ]);
  });

  it("fiyat: sınırlar dahil, fiyatsız ürün uymaz", () => {
    expect(uyanlar(filtre({ fiyat: { enAz: 29_990 } }))).toEqual(["tisort", "gomlek"]);
    expect(uyanlar(filtre({ fiyat: { enCok: 29_990 } }))).toEqual(["tisort"]);
    expect(uyanlar(filtre({ fiyat: { enAz: 29_991, enCok: 79_990 } }))).toEqual(["gomlek"]);
    expect(uyanlar(filtre({ fiyat: { enAz: 0 } }))).toEqual(["tisort", "gomlek"]);
  });

  it("grup dışarıda bırakılınca o grubun seçimi yok sayılır", () => {
    const f = filtre({ markalar: ["baska"], secenekler: { beden: ["m"] } });
    expect(filtreyeUyarMi(tisort, f)).toBe(false);
    expect(filtreyeUyarMi(tisort, f, { tur: "marka" })).toBe(true);
    expect(filtreyeUyarMi(gomlek, f, { tur: "secenek", anahtar: "beden" })).toBe(true);
    expect(filtreyeUyarMi(gomlek, f, { tur: "secenek", anahtar: "renk" })).toBe(false);
  });
});

describe("seçeneğin sayısı", () => {
  it("grupta yalnız o seçenek seçilmiş gibidir, öteki grupların seçimi yerindedir", () => {
    const f = filtre({ markalar: ["orn"], secenekler: { beden: ["m"] } });
    // Marka grubunda "baska": beden M seçiliyken gömlek uymaz.
    expect(secenekSayisi(hepsi, f, { tur: "marka" }, "baska")).toBe(0);
    expect(secenekSayisi(hepsi, f, { tur: "marka" }, "orn")).toBe(1);
    // Beden grubunda L: marka orn seçiliyken gömlek uymaz.
    expect(secenekSayisi(hepsi, f, { tur: "secenek", anahtar: "beden" }, "l")).toBe(0);
    expect(secenekSayisi(hepsi, bosFiltre(), { tur: "secenek", anahtar: "renk" }, "beyaz")).toBe(2);
    expect(secenekSayisi(hepsi, bosFiltre(), { tur: "stok" }, "")).toBe(2);
    expect(secenekSayisi(hepsi, f, { tur: "stok" }, "")).toBe(1);
  });
});

describe("fiyata göre sıralama", () => {
  it("fiyatsız sonda; eşit fiyatta gelen sıra korunur", () => {
    const esit = aday("esit", { fiyat: 29_990 });
    const liste = [canta, gomlek, tisort, esit];
    expect(fiyataGoreSirala(liste, "artan").map((a) => a.kimlik)).toEqual([
      "tisort",
      "esit",
      "gomlek",
      "canta",
    ]);
    expect(fiyataGoreSirala(liste, "azalan").map((a) => a.kimlik)).toEqual([
      "gomlek",
      "tisort",
      "esit",
      "canta",
    ]);
  });
});
