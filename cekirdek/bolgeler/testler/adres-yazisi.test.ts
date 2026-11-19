// Adresin tek satırlık yazısı (kart 0234): il ve ilçe kodla değil listenin adlarıyla, boş parça yazılmaz. Panelin
// sipariş ayrıntısında il ve ilçe kodları görünüyordu (taslakla karşılaştırmada bulundu).
import { describe, expect, it } from "vitest";
import { adresYazisi } from "../adres-yazisi.ts";

const ulkeAdi = (kod: string) => (kod === "TR" ? "Türkiye" : kod);

describe("adres yazısı", () => {
  it("il ve ilçe adlarıyla, posta koduyla ve ülkeyle yazılır", () => {
    expect(
      adresYazisi(
        {
          ulke: "TR",
          il: "TR-06",
          ilce: "TR-06-007",
          adres: "Atatürk Bulvarı No: 10",
          postaKodu: "06420",
        },
        ulkeAdi,
      ),
    ).toBe("Atatürk Bulvarı No: 10, 06420, Çankaya / Ankara, Türkiye");
  });
  it("boş açık adres ve eksik parça yazılmaz", () => {
    expect(adresYazisi({ ulke: "TR", il: "TR-06", adres: "" }, ulkeAdi)).toBe("Ankara, Türkiye");
  });
});
