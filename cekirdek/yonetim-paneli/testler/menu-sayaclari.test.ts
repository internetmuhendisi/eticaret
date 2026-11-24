// Panel menüsündeki sayılar (kart 0277): sıfır olan sayı sonuçta yoktur, aynı sayaç bir kez okunur; okunamayan sayı
// paneli düşürmez, menü sayısız çizilir ve hata kaydedilir.
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { menuSayaciTanimlari, menuSayilariniOku } from "../menu-sayaclari.ts";

const { kaydedilen } = vi.hoisted(() => ({ kaydedilen: [] as unknown[] }));
vi.mock("../../izleme/hata-katmani.ts", () => ({
  hatayiKaydet: (hata: unknown, baglam: unknown) => kaydedilen.push({ hata, baglam }),
}));

const vt = {} as Veritabani;
const tanim = menuSayaciTanimlari["onay-bekleyen-yorum"];
const asil = tanim.oku;
afterEach(() => {
  tanim.oku = asil;
  kaydedilen.length = 0;
});

describe("menü sayıları", () => {
  it("sayı okunur; sıfır sonuçta yok; aynı sayaç bir kez okunur", async () => {
    const oku = vi.fn(async () => 7);
    tanim.oku = oku;
    expect(await menuSayilariniOku(vt, ["onay-bekleyen-yorum", "onay-bekleyen-yorum"])).toEqual({
      "onay-bekleyen-yorum": 7,
    });
    expect(oku).toHaveBeenCalledTimes(1);
    tanim.oku = async () => 0;
    expect(await menuSayilariniOku(vt, ["onay-bekleyen-yorum"])).toEqual({});
    expect(await menuSayilariniOku(vt, [])).toEqual({});
  });

  it("okunamayan sayı sonuçta yok, hata kaydedilir", async () => {
    tanim.oku = async () => {
      throw new Error("veritabanı yok");
    };
    expect(await menuSayilariniOku(vt, ["onay-bekleyen-yorum"])).toEqual({});
    expect(kaydedilen).toHaveLength(1);
    expect(kaydedilen[0]).toMatchObject({
      baglam: { ekran: "panel-menusu", sayac: "onay-bekleyen-yorum" },
    });
  });
});
