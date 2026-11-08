// Eski fiyat (kart 0081, karar 0067): elle hesaplanmış geçmişlerle. 30 gün indirimin başladığı andan
// geriye sayılır, önceki indirimler dahildir, kesintisiz değişen indirim ilk başlangıcını korur, en
// düşük fiyat bugünkünden yüksek değilse ya da o dönemde fiyat yoksa eski fiyat yoktur, ayar kapalıyken
// eski fiyat satış fiyatıdır.
import { describe, expect, it } from "vitest";
import { eskiFiyatGunu, eskiFiyatiBul } from "../eski-fiyat.ts";
import type { FiyatGecmisiSatiri } from "../servis.ts";

const ilk = Date.parse("2026-09-01T00:00:00Z");
const gun = (n: number) => new Date(ilk + n * 24 * 60 * 60 * 1000);
const once = (an: Date) => new Date(an.getTime() - 1);

const satir = (
  zaman: number,
  satisFiyati: number,
  indirim?: { fiyat: number; bas?: number; bit?: number },
  paraBirimi = "XTS",
): FiyatGecmisiSatiri => ({
  kimlik: `satir-${zaman}`,
  zaman: gun(zaman),
  satisFiyati,
  indirimliFiyat: indirim?.fiyat ?? null,
  indirimBaslangici: indirim?.bas === undefined ? null : gun(indirim.bas),
  indirimBitisi: indirim?.bit === undefined ? null : gun(indirim.bit),
  paraBirimi,
});

// Fiyatı birkaç kez değişmiş ürün. Elle hesap:
// gün 0–10: 120,00 | 10–16: 110,00 | 16–18: 105,00 (önceki indirim) | 18–20: 110,00 |
// 20–41: 130,00 | 41'den sonra: 100,00 (bugünkü indirim, gün 40'ta yazıldı, gün 41'de başlar).
// İndirim gün 41'de başladığı için pencere gün 11–41'dir: 120,00 dışarıda kalır, en düşük 105,00.
const gecmis = [
  satir(0, 12_000),
  satir(10, 11_000),
  satir(15, 11_000, { fiyat: 10_500, bas: 16, bit: 18 }),
  satir(20, 13_000),
  satir(40, 13_000, { fiyat: 10_000, bas: 41 }),
];

describe("eski fiyat", () => {
  it("fiyatı birkaç kez değişmiş üründe elle hesaplanan değer", () => {
    expect(eskiFiyatGunu).toBe(30);
    expect(eskiFiyatiBul(gecmis, gun(45), "XTS", true)).toBe(10_500);
  });

  it("30 gün bugünden değil indirimin başladığı andan geriye sayılır", () => {
    // Gün 75'te bugünden geriye 30 gün yalnız indirimi (100,00) görürdü.
    expect(eskiFiyatiBul(gecmis, gun(75), "XTS", true)).toBe(10_500);
  });

  it("pencerenin sınırı: başlangıçtan tam 30 gün önceki fiyat dahil, öncesi değil", () => {
    // İndirim gün 41'de başlar, pencere gün 11'de açılır. 120,00 tam gün 11'de biter: dışarıdadır.
    const sinir = [
      satir(0, 12_000),
      satir(11, 15_000),
      satir(40, 15_000, { fiyat: 10_000, bas: 41 }),
    ];
    expect(eskiFiyatiBul(sinir, gun(45), "XTS", true)).toBe(15_000);
    // 120,00 gün 11'den bir milisaniye sonrasına kadar sürerse pencereye girer.
    const birMs = [
      satir(0, 12_000),
      { ...satir(11, 15_000), zaman: new Date(gun(11).getTime() + 1) },
      satir(40, 15_000, { fiyat: 10_000, bas: 41 }),
    ];
    expect(eskiFiyatiBul(birMs, gun(45), "XTS", true)).toBe(12_000);
  });

  it("indirim fiyatı kesintisiz değişirse başlangıç ilk indirimdir", () => {
    const degisen = [...gecmis, satir(50, 13_000, { fiyat: 9_000 })];
    expect(eskiFiyatiBul(degisen, gun(55), "XTS", true)).toBe(10_500);
  });

  it("ara verilip yeniden başlayan indirimin başlangıcı yenisidir", () => {
    // Gün 50'de indirim kalkar, gün 60'ta yeniden başlar: pencere gün 30–60, en düşük 100,00 (gün 41–50).
    const yeniden = [...gecmis, satir(50, 13_000), satir(60, 13_000, { fiyat: 9_000 })];
    expect(eskiFiyatiBul(yeniden, gun(65), "XTS", true)).toBe(10_000);
    // İndirimin kendi bitişiyle verilen ara da sayılır.
    const bitisli = [
      satir(0, 13_000),
      satir(10, 13_000, { fiyat: 11_000, bas: 10, bit: 20 }),
      satir(25, 13_000, { fiyat: 9_000, bas: 25 }),
    ];
    expect(eskiFiyatiBul(bitisli, gun(30), "XTS", true)).toBe(11_000);
  });

  it("en düşük fiyat bugünkü fiyattan yüksek değilse eski fiyat yok", () => {
    const dusuk = [
      satir(0, 13_000),
      satir(10, 13_000, { fiyat: 9_500, bas: 10, bit: 12 }),
      satir(20, 13_000, { fiyat: 10_000, bas: 20 }),
    ];
    expect(eskiFiyatiBul(dusuk, gun(25), "XTS", true)).toBeUndefined();
    const esit = [satir(0, 10_000), satir(20, 13_000, { fiyat: 10_000, bas: 20 })];
    expect(eskiFiyatiBul(esit, gun(25), "XTS", true)).toBeUndefined();
  });

  it("indirimden önce fiyat yoksa eski fiyat yok", () => {
    expect(
      eskiFiyatiBul([satir(0, 13_000, { fiyat: 10_000 })], gun(5), "XTS", true),
    ).toBeUndefined();
    // Başlangıcı geçmişte yazılmış indirim, satır yazıldığı anda başlar: önceki fiyat yine yoktur.
    expect(
      eskiFiyatiBul([satir(10, 13_000, { fiyat: 10_000, bas: 0 })], gun(15), "XTS", true),
    ).toBeUndefined();
  });

  it("indirimde değilse eski fiyat yok; indirim bitiş anında biter", () => {
    expect(eskiFiyatiBul(gecmis, gun(30), "XTS", true)).toBeUndefined();
    expect(eskiFiyatiBul(gecmis, once(gun(41)), "XTS", true)).toBeUndefined();
    expect(eskiFiyatiBul(gecmis, gun(41), "XTS", true)).toBe(10_500);
    const bitisli = [...gecmis.slice(0, 4), satir(40, 13_000, { fiyat: 10_000, bas: 41, bit: 50 })];
    expect(eskiFiyatiBul(bitisli, once(gun(50)), "XTS", true)).toBe(10_500);
    expect(eskiFiyatiBul(bitisli, gun(50), "XTS", true)).toBeUndefined();
  });

  it("ayar kapalıyken eski fiyat indirimden önceki satış fiyatı", () => {
    expect(eskiFiyatiBul(gecmis, gun(45), "XTS", false)).toBe(13_000);
    expect(eskiFiyatiBul(gecmis, gun(30), "XTS", false)).toBeUndefined();
  });

  it("başka para birimindeki satırlar o dönemde fiyat yokmuş gibi sayılır", () => {
    const karisik = [
      satir(10, 9_000, undefined, "XAA"),
      satir(20, 12_000),
      satir(30, 12_000, { fiyat: 10_000, bas: 31 }),
    ];
    expect(eskiFiyatiBul(karisik, gun(35), "XTS", true)).toBe(12_000);
    expect(eskiFiyatiBul(karisik, gun(35), "XAA", true)).toBeUndefined();
  });

  it("aynı anda yazılmış iki satırdan sonraki geçer, öncekinin süresi sıfırdır", () => {
    // Gün 10'da iki satır: 110,00 hiç uygulanmadı, 130,00 uygulandı. Pencere gün 11–41: en düşük 130,00.
    const ayniAn = [
      satir(0, 12_000),
      satir(10, 11_000),
      { ...satir(10, 13_000), kimlik: "satir-10-ikinci" },
      satir(40, 13_000, { fiyat: 10_000, bas: 41 }),
    ];
    expect(eskiFiyatiBul(ayniAn, gun(45), "XTS", true)).toBe(13_000);
  });

  it("verilen andan sonra yazılan satırlar hesaba girmez", () => {
    expect(eskiFiyatiBul(gecmis, gun(39), "XTS", true)).toBeUndefined();
    expect(eskiFiyatiBul([...gecmis, satir(60, 9_000)], gun(45), "XTS", true)).toBe(10_500);
    expect(eskiFiyatiBul([...gecmis, satir(60, 9_000)], gun(45), "XTS", false)).toBe(13_000);
  });
});
