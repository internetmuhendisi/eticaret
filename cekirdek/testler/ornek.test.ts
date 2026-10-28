// Örnek birim testi: Vitest'in kurulu olduğunu ve testleri bulduğunu gösterir.
// İlk gerçek birim testi yazılınca bu dosya silinir.
import { describe, expect, it } from "vitest";

const tekrarlariAt = <T>(liste: readonly T[]) => [...new Set(liste)];

describe("örnek birim testi", () => {
  it("listedeki tekrarları sırayı bozmadan atar", () => {
    expect(tekrarlariAt([3, 1, 3, 2, 1])).toEqual([3, 1, 2]);
  });
});
