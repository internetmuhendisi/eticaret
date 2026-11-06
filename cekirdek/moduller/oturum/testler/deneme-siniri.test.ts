// Yanlış giriş sayacı (kart 0027, karar 0042). Veritabanı gerektirmez.
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { denemeleriSil, denemeyiAyir, denemeyiGeriVer } from "../deneme-siniri.ts";

const kural = (deneme = 3, saniye = 100) => ({ anahtar: randomUUID(), deneme, saniye });

describe("deneme sayacı", () => {
  it("sınıra kadar izin verir, sonra son denemeden itibaren tam süre bekletir", () => {
    const k = kural();
    expect(denemeyiAyir([k], 1_000)).toBeNull();
    expect(denemeyiAyir([k], 50_000)).toBeNull();
    expect(denemeyiAyir([k], 90_000)).toBeNull();
    expect(denemeyiAyir([k], 90_000)).toBe(100);
    expect(denemeyiAyir([k], 189_000)).toBe(1);
    expect(denemeyiAyir([k], 190_000)).toBeNull();
  });

  it("süre dolunca sayaç sıfırlanır", () => {
    const k = kural();
    denemeyiAyir([k], 0);
    denemeyiAyir([k], 1_000);
    expect(denemeyiAyir([k], 101_000)).toBeNull();
    expect(denemeyiAyir([k], 101_000)).toBeNull();
    expect(denemeyiAyir([k], 101_000)).toBeNull();
    expect(denemeyiAyir([k], 101_000)).toBe(100);
  });

  it("biri doluysa hiçbir sayaç artmaz", () => {
    const dolu = kural(1);
    const oteki = kural(2);
    denemeyiAyir([dolu], 0);
    expect(denemeyiAyir([dolu, oteki], 0)).toBe(100);
    expect(denemeyiAyir([dolu, oteki], 0)).toBe(100);
    // Öteki hiç artmadıysa iki denemesi de duruyor.
    expect(denemeyiAyir([oteki], 0)).toBeNull();
    expect(denemeyiAyir([oteki], 0)).toBeNull();
    expect(denemeyiAyir([oteki], 0)).toBe(100);
  });

  it("geri verilen deneme sayılmaz, silinen sayaç sıfırdan başlar", () => {
    const k = kural(2);
    denemeyiAyir([k], 0);
    denemeyiGeriVer(k.anahtar);
    denemeyiAyir([k], 0);
    expect(denemeyiAyir([k], 0)).toBeNull();
    expect(denemeyiAyir([k], 0)).toBe(100);
    denemeleriSil(k.anahtar);
    expect(denemeyiAyir([k], 0)).toBeNull();
  });
});
