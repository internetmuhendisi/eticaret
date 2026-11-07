// Kuruş yuvarlamasının tek kuralı (kart 0075, karar 0061). Veritabanı gerektirmez.
import { describe, expect, it } from "vitest";
import { bolVeYuvarla, kurusa, oranlaDagit } from "../yuvarlama.ts";

describe("ticari yuvarlama", () => {
  it("yarım ve üstü yukarı, altı aşağı", () => {
    expect(bolVeYuvarla(5n, 2n)).toBe(3n); // 2,5
    expect(bolVeYuvarla(7n, 2n)).toBe(4n); // 3,5
    expect(bolVeYuvarla(249n, 100n)).toBe(2n); // 2,49
    expect(bolVeYuvarla(251n, 100n)).toBe(3n); // 2,51
    expect(bolVeYuvarla(0n, 7n)).toBe(0n);
    expect(bolVeYuvarla(6n, 3n)).toBe(2n);
  });

  it("eksi tutar ve sıfır payda kabul edilmez", () => {
    expect(() => bolVeYuvarla(-1n, 2n)).toThrow();
    expect(() => bolVeYuvarla(1n, 0n)).toThrow();
  });

  it("güvenli tam sayıyı aşan tutar sayıya çevrilmez", () => {
    expect(kurusa(BigInt(Number.MAX_SAFE_INTEGER))).toBe(Number.MAX_SAFE_INTEGER);
    expect(() => kurusa(BigInt(Number.MAX_SAFE_INTEGER) + 1n)).toThrow();
  });
});

describe("oranla dağıtma", () => {
  it("paylar toplamı korur, artan kuruş küsuratı büyüğe, eşitse önce gelene gider", () => {
    expect(oranlaDagit(10n, [1n, 1n, 1n])).toEqual([4n, 3n, 3n]);
    expect(oranlaDagit(11n, [1n, 1n, 1n])).toEqual([4n, 4n, 3n]);
    expect(oranlaDagit(7n, [1n, 3n])).toEqual([2n, 5n]); // 1,75 ve 5,25
    expect(oranlaDagit(5n, [0n, 0n])).toEqual([5n, 0n]);
    expect(oranlaDagit(0n, [3n, 4n])).toEqual([0n, 0n]);
  });
});
