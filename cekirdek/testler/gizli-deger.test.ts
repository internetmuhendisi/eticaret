import { describe, expect, it } from "vitest";
import { gizliGeciyor } from "./gizli-deger.ts";

describe("gizli değer denetimi (kart 0310)", () => {
  it("kısa rakam dizisi rastgele kimlikte ve özette geçmiş sayılmaz", () => {
    expect(gizliGeciyor("siparis-gecmisi:35b34454-a889-4555-9d3d-102c862ecc0d", "555")).toBe(false);
    expect(gizliGeciyor('{"kimlik":"0a06420f-1111-4111-8111-111111111111"}', "06420")).toBe(false);
    expect(gizliGeciyor("/_next/static/chunks/a0555f3e.js", "0555")).toBe(false);
  });

  it("kısa rakam dizisi tek başına geçince yakalanır", () => {
    expect(gizliGeciyor('{"postaKodu":"06420"}', "06420")).toBe(true);
    expect(gizliGeciyor("Çankaya 06420 Ankara", "06420")).toBe(true);
    expect(gizliGeciyor("<span>0555</span>", "0555")).toBe(true);
    expect(gizliGeciyor("tel: 555 000 00 42", "555 000")).toBe(true);
  });

  it("uzun rakam dizisi ve rakam dışı değer bitişik de yakalanır", () => {
    expect(gizliGeciyor('{"telefon":"+905551234567"}', "5551234567")).toBe(true);
    expect(gizliGeciyor("DenizYılmaz", "Yılmaz")).toBe(true);
    expect(gizliGeciyor("a.b@ornek.test", "a.b@ornek.test")).toBe(true);
    expect(gizliGeciyor("abc", "a.b")).toBe(false);
  });
});
