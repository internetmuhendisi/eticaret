// İade hesabı elle hesaplanmış örneklerle (kart 0235, karar 0147). Oranlar milyonda birdir: 200000, 180000, 100000 ve 5000.
//
// Sipariş (kuruş):
// - Kalem 0: 3 adet, vergisiz 24999, vergi 5000 (oran 200000); maliyet 29999.
//   1. adet: round(29999/3) = 10000, vergi round(5000/3) = 1667.
//   2. adet: round(29999·2/3) − 10000 = 19999 − 10000 = 9999, vergi round(10000/3) − 1667 = 3333 − 1667 = 1666.
//   3. adet: 29999 − 19999 = 10000, vergi 5000 − 3333 = 1667. Toplam tam kalemin kendisi.
// - Kalem 1: 1 adet, vergisiz 10000, vergi 1000 (oran 100000).
// - Kalem 2: 2 adet, vergisiz 10000, vergi 1850 (oran 180000 "A" ve 5000 "Ek", aynı vergisiz tutardan): 1 adet 5925, vergi 925
//   → A 925·180000/185000 = 900, Ek 925·5000/185000 = 25.
// - Kargo 2400, vergisi 400 (oran 200000), matrahı 2000.
// Toplam 29999 + 11000 + 11850 + 2400 = 55249; vergi 5000 + 1000 + 1850 + 400 = 8250.
import { describe, expect, it } from "vitest";
import { type HesapSiparisi, IadeHesapHatasi, iadeyiHesapla } from "../iade-hesabi.ts";

const yirmi = { oran: 200_000 };
const siparis = (odenen: number | null = 55_249): HesapSiparisi => ({
  toplam: 55_249,
  vergiToplami: 8250,
  vergiDokumu: [
    { oran: 200_000, matrah: 26_999, vergi: 5400 },
    { ad: "A", oran: 180_000, matrah: 10_000, vergi: 1800 },
    { oran: 100_000, matrah: 10_000, vergi: 1000 },
    { ad: "Ek", oran: 5000, matrah: 10_000, vergi: 50 },
  ],
  odenen,
  kalemler: [
    { sira: 0, adet: 3, vergisiz: 24_999, vergi: 5000, vergiOranlari: [yirmi] },
    { sira: 1, adet: 1, vergisiz: 10_000, vergi: 1000, vergiOranlari: [{ oran: 100_000 }] },
    {
      sira: 2,
      adet: 2,
      vergisiz: 10_000,
      vergi: 1850,
      vergiOranlari: [
        { ad: "A", oran: 180_000 },
        { ad: "Ek", oran: 5000 },
      ],
    },
  ],
});

const hatasi = (is: () => unknown) => {
  try {
    is();
  } catch (hata) {
    if (hata instanceof IadeHesapHatasi) return { kod: hata.kod, alan: hata.alan };
    throw hata;
  }
  throw new Error("Hata bekleniyordu.");
};

describe("kısmi iade", () => {
  it("bir adet: tutar ve vergi adet payıyla, matrah tutardan vergi çıkınca", () => {
    expect(
      iadeyiHesapla(siparis(), [], "iade", { kalemler: [{ sira: 0, adet: 1 }], kargo: false }),
    ).toEqual({
      tutar: 10_000,
      vergiDokumu: [{ oran: 200_000, matrah: 8333, vergi: 1667 }],
      kalemler: [{ sira: 0, adet: 1, tutar: 10_000 }],
      kargoTutari: 0,
      tam: false,
    });
  });

  it("sırayla iade edilen adetlerin toplamı tam kalemin kendisi, artan kuruş kalmaz", () => {
    const ilk = iadeyiHesapla(siparis(), [], "iade", {
      kalemler: [{ sira: 0, adet: 1 }],
      kargo: false,
    });
    const ikinci = iadeyiHesapla(
      siparis(),
      [{ tutar: ilk.tutar, kargoTutari: 0, kalemler: [{ sira: 0, adet: 1 }] }],
      "iade",
      { kalemler: [{ sira: 0, adet: 1 }], kargo: false },
    );
    expect(ikinci.tutar).toBe(9999);
    expect(ikinci.vergiDokumu).toEqual([{ oran: 200_000, matrah: 8333, vergi: 1666 }]);
    const ucuncu = iadeyiHesapla(
      siparis(),
      [
        { tutar: 10_000, kargoTutari: 0, kalemler: [{ sira: 0, adet: 1 }] },
        { tutar: 9999, kargoTutari: 0, kalemler: [{ sira: 0, adet: 1 }] },
      ],
      "iade",
      { kalemler: [{ sira: 0, adet: 1 }], kargo: false },
    );
    expect(ucuncu.tutar).toBe(10_000);
    expect(ucuncu.vergiDokumu[0]?.vergi).toBe(1667);
    expect(10_000 + 9999 + ucuncu.tutar).toBe(29_999);
    expect(1667 + 1666 + 1667).toBe(5000);
  });

  it("iki orana bölünmüş vergi oranların büyüklüğüyle dağılır", () => {
    const hesap = iadeyiHesapla(siparis(), [], "iade", {
      kalemler: [{ sira: 2, adet: 1 }],
      kargo: false,
    });
    expect(hesap.tutar).toBe(5925);
    expect(hesap.vergiDokumu).toEqual([
      { ad: "A", oran: 180_000, matrah: 5000, vergi: 900 },
      { ad: "Ek", oran: 5000, matrah: 5000, vergi: 25 },
    ]);
  });

  it("yalnız kargo: maliyeti ve vergisi siparişin kalanından", () => {
    const hesap = iadeyiHesapla(siparis(), [], "iade", { kalemler: [], kargo: true });
    expect(hesap).toMatchObject({
      tutar: 2400,
      kargoTutari: 2400,
      vergiDokumu: [{ oran: 200_000, matrah: 2000, vergi: 400 }],
    });
  });

  it("kargonun vergisi siparişin dökümünün sırasına bağlı değil: kalemlerin vergisi çıkınca kalan oran", () => {
    const ters = { ...siparis(), vergiDokumu: [...siparis().vergiDokumu].reverse() };
    expect(iadeyiHesapla(ters, [], "iade", { kalemler: [], kargo: true }).vergiDokumu).toEqual([
      { oran: 200_000, matrah: 2000, vergi: 400 },
    ]);
  });

  it("kargo dahil ve hariç; kargo ikinci kez iade edilemez", () => {
    const secim = { kalemler: [{ sira: 1, adet: 1 }] };
    expect(iadeyiHesapla(siparis(), [], "iade", { ...secim, kargo: false }).tutar).toBe(11_000);
    expect(iadeyiHesapla(siparis(), [], "iade", { ...secim, kargo: true }).tutar).toBe(13_400);
    expect(
      hatasi(() =>
        iadeyiHesapla(siparis(), [{ tutar: 2400, kargoTutari: 2400, kalemler: [] }], "iade", {
          ...secim,
          kargo: true,
        }),
      ),
    ).toEqual({ kod: "kargo-iade-edildi", alan: "kargo" });
  });

  it("elle tutar: vergi hesaplananla orantılı, yarım kuruş yukarı", () => {
    // 1667·5000/10000 = 833,5 → 834; matrah 8333·5000/10000 = 4166,5 → 4167.
    expect(
      iadeyiHesapla(siparis(), [], "iade", {
        kalemler: [{ sira: 0, adet: 1 }],
        kargo: false,
        elleTutar: 5000,
      }),
    ).toMatchObject({ tutar: 5000, vergiDokumu: [{ oran: 200_000, matrah: 4167, vergi: 834 }] });
  });

  it("ürün seçilmeden elle tutar: vergi siparişin dökümüyle orantılı", () => {
    // 11050/55249: 5400 → 1080,02 → 1080; 1800 → 360,007 → 360; 1000 → 200,004 → 200; 50 → 10,0001 → 10.
    const hesap = iadeyiHesapla(siparis(), [], "iade", {
      kalemler: [],
      kargo: false,
      elleTutar: 11_050,
    });
    expect(hesap.tutar).toBe(11_050);
    expect(hesap.vergiDokumu.map((satir) => satir.vergi)).toEqual([1080, 360, 200, 10]);
  });

  it("toplam ödenen tutarı aşamaz, sıfır ve boş iade olmaz", () => {
    expect(
      hatasi(() =>
        iadeyiHesapla(siparis(), [{ tutar: 50_000, kargoTutari: 0, kalemler: [] }], "iade", {
          kalemler: [],
          kargo: false,
          elleTutar: 5250,
        }),
      ),
    ).toEqual({ kod: "tutar-fazla", alan: "tutar" });
    // Kalan tam 5249: eşit tutar geçer.
    expect(
      iadeyiHesapla(siparis(), [{ tutar: 50_000, kargoTutari: 0, kalemler: [] }], "iade", {
        kalemler: [],
        kargo: false,
        elleTutar: 5249,
      }).tutar,
    ).toBe(5249);
    expect(
      hatasi(() =>
        iadeyiHesapla(siparis(), [], "iade", { kalemler: [], kargo: false, elleTutar: 0 }),
      ),
    ).toEqual({
      kod: "tutar-gecersiz",
      alan: "tutar",
    });
    expect(
      hatasi(() => iadeyiHesapla(siparis(), [], "iade", { kalemler: [], kargo: false })),
    ).toEqual({
      kod: "bos-iade",
      alan: "kalemler",
    });
  });

  it("iade edilmiş adet yeniden seçilemez; olmayan kalem ve ödenmemiş sipariş reddedilir", () => {
    expect(
      hatasi(() =>
        iadeyiHesapla(
          siparis(),
          [{ tutar: 10_000, kargoTutari: 0, kalemler: [{ sira: 0, adet: 1 }] }],
          "iade",
          {
            kalemler: [{ sira: 0, adet: 3 }],
            kargo: false,
          },
        ),
      ),
    ).toEqual({ kod: "adet-fazla", alan: "kalemler.0" });
    expect(
      hatasi(() =>
        iadeyiHesapla(siparis(), [], "iade", { kalemler: [{ sira: 9, adet: 1 }], kargo: false }),
      ),
    ).toEqual({
      kod: "kalem-yok",
      alan: "kalemler.9",
    });
    expect(
      hatasi(() =>
        iadeyiHesapla(siparis(null), [], "iade", {
          kalemler: [{ sira: 0, adet: 1 }],
          kargo: false,
        }),
      ),
    ).toEqual({ kod: "odenmemis", alan: "tutar" });
  });
});

describe("tam iade ve iptal", () => {
  const hepsi = {
    kalemler: [
      { sira: 0, adet: 3 },
      { sira: 1, adet: 1 },
      { sira: 2, adet: 2 },
    ],
    kargo: true,
  };

  it("siparişin kalanının tamamı: ödenen kalan döner (taksit farkı dahil), döküm siparişinki", () => {
    const hesap = iadeyiHesapla(siparis(56_000), [], "iade", hepsi);
    expect(hesap.tam).toBe(true);
    expect(hesap.tutar).toBe(56_000);
    expect(hesap.vergiDokumu.map((satir) => [satir.oran, satir.vergi])).toEqual([
      [200_000, 5400],
      [180_000, 1800],
      [100_000, 1000],
      [5000, 50],
    ]);
  });

  it("önceki kısmi iadeden sonra kalanların tamamı: ödenen eksi önceki", () => {
    const hesap = iadeyiHesapla(
      siparis(56_000),
      [{ tutar: 10_000, kargoTutari: 0, kalemler: [{ sira: 0, adet: 1 }] }],
      "iade",
      {
        kalemler: [
          { sira: 0, adet: 2 },
          { sira: 1, adet: 1 },
          { sira: 2, adet: 2 },
        ],
        kargo: true,
      },
    );
    expect(hesap).toMatchObject({ tam: true, tutar: 46_000 });
  });

  it("iptal: ödeme alınmadıysa sıfır, alındıysa ödenen kalan; bütün kalemler iptale girer", () => {
    const odenmemis = iadeyiHesapla(siparis(null), [], "iptal", { kalemler: [], kargo: false });
    expect(odenmemis).toMatchObject({ tutar: 0, vergiDokumu: [], kargoTutari: 2400, tam: true });
    expect(odenmemis.kalemler.map((kalem) => [kalem.sira, kalem.adet])).toEqual([
      [0, 3],
      [1, 1],
      [2, 2],
    ]);
    expect(iadeyiHesapla(siparis(56_000), [], "iptal", { kalemler: [], kargo: false }).tutar).toBe(
      56_000,
    );
  });
});
