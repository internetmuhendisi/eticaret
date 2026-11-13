// Menü hatalarının paneldeki metni (kart 0143): yalnız formda olan alanlar alana bağlanır, alanı olmayan hata
// ("menu-dolu" gibi) kendi metniyle formun üstünde görünür; menünün kodu adın alanına eşlenir.
import { describe, expect, it } from "vitest";
import { menuAlanHatalari, menuHataMetni } from "../menuler/hatalar.ts";

describe("menü hataları", () => {
  it("formda alanı olmayan iş kuralı hatası alana bağlanmaz, kendi metni döner", () => {
    const hata = { kod: "is-kurali", ayrinti: [{ alan: "menu", kod: "menu-dolu" }] };
    expect(menuAlanHatalari(hata, ["metin", "hedef", "ust"])).toEqual({});
    expect(menuHataMetni(hata)).toBe("yonetim.menu.hata.menu-dolu");
  });

  it("formdaki alanlar ve altları bağlanır; kodun hatası adın alanına eşlenir", () => {
    expect(
      menuAlanHatalari(
        {
          kod: "dogrulama",
          ayrinti: [
            { alan: "metin", kod: "metin-gerekli" },
            { alan: "hedef.adres", kod: "baglanti-gecersiz" },
          ],
        },
        ["metin", "hedef", "ust"],
      ),
    ).toEqual({
      metin: "yonetim.menu.hata.metin-gerekli",
      "hedef.adres": "yonetim.menu.hata.baglanti-gecersiz",
    });
    expect(
      menuAlanHatalari({ kod: "cakisma", ayrinti: [{ alan: "kod", kod: "kod-tekrar" }] }, ["ad"], {
        kod: "ad",
      }),
    ).toEqual({ ad: "yonetim.menu.hata.kod-tekrar" });
  });
});
