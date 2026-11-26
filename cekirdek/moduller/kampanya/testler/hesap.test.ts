// Kuponun saf hesabı elle hesaplanmış örneklerle (kart 0312, karar 0187).
import { describe, expect, it } from "vitest";
import { type HesapKuponu, type KuponDurumu, type KuponSatiri, kuponuUygula } from "../hesap.ts";

const kupon = (ek: Partial<HesapKuponu> = {}): HesapKuponu => ({
  tur: "yuzde",
  deger: 10,
  enAzTutar: null,
  baslangic: null,
  bitis: null,
  toplamSinir: null,
  kisiBasiSinir: null,
  indirimdeGecmez: false,
  acik: true,
  ...ek,
});
const satir = (tutar: number, ek: Partial<KuponSatiri> = {}): KuponSatiri => ({
  tutar,
  kapsamda: true,
  indirimde: false,
  ...ek,
});
const an = new Date("2026-12-01T10:00:00.000Z");
const durum = (ek: Partial<KuponDurumu> = {}): KuponDurumu => ({
  an,
  araToplam: 100_000,
  toplamKullanim: 0,
  ...ek,
});

// Tutar kuponu; ürünlerin toplamı kuponu aşmıyorsa 1 kuruş kalır: 2.999 → 1.199,6 ve 1.799,4, artan kuruş ilkine.
const kuponUygula_ = (deger: number, satirlar: KuponSatiri[]) =>
  kuponuUygula(kupon({ tur: "tutar", deger }), satirlar, durum());

describe("kuponun indirimi", () => {
  it("yüzde: kapsam toplamının yüzdesi bir kez yuvarlanır, artan kuruş küsuratı büyük olana", () => {
    // 20.000 × yüzde 10 = 2.000; paylar 1.000, 333,3, 666,7 → 1.000, 333, 667.
    const sonuc = kuponuUygula(kupon(), [satir(10_000), satir(3_333), satir(6_667)], durum());
    expect(sonuc).toEqual({
      gecti: true,
      indirimler: [1_000, 333, 667],
      ucretsizKargo: false,
      disarida: [null, null, null],
    });
  });

  it("yüzde: yarım kuruş yukarı yuvarlanır", () => {
    // 12.345 × yüzde 10 = 1.234,5 → 1.235.
    const sonuc = kuponuUygula(kupon(), [satir(12_345)], durum());
    expect(sonuc).toMatchObject({ gecti: true, indirimler: [1_235] });
  });

  it("ürünler sıfıra inmez: indirim bütün ürünlerden 1 kuruş bırakır; kapsam dışı ürün kalırsa kapsamın tamamı iner", () => {
    // Yüzde 99 ile 1 kuruşluk ürün: 0,99 → 1 kuruş olurdu, 0 bırakırdı; indirim 0'a iner.
    expect(kuponuUygula(kupon({ deger: 99 }), [satir(1)], durum())).toMatchObject({
      gecti: true,
      indirimler: [0],
    });
    expect(
      kuponuUygula(kupon({ tur: "tutar", deger: 10_000 }), [satir(3_000)], durum()),
    ).toMatchObject({ indirimler: [2_999] });
    expect(
      kuponuUygula(
        kupon({ tur: "tutar", deger: 10_000 }),
        [satir(3_000), satir(500, { kapsamda: false })],
        durum(),
      ),
    ).toMatchObject({ indirimler: [3_000, 0] });
  });

  it("tutar: tutarlarıyla orantılı dağılır, kapsamın toplamını aşmaz", () => {
    expect(
      kuponuUygula(kupon({ tur: "tutar", deger: 5_000 }), [satir(7_000), satir(3_000)], durum()),
    ).toMatchObject({ gecti: true, indirimler: [3_500, 1_500] });
    expect(kuponUygula_(5_000, [satir(1_200), satir(1_800)])).toMatchObject({
      gecti: true,
      indirimler: [1_200, 1_799],
    });
    // 1.000 üç eşit satıra: 333, 333, 333 ve artan 1 kuruş ilk satıra (küsuratlar eşit).
    expect(
      kuponuUygula(
        kupon({ tur: "tutar", deger: 1_000 }),
        [satir(500), satir(500), satir(500)],
        durum(),
      ),
    ).toMatchObject({ indirimler: [334, 333, 333] });
  });

  it("kapsam dışı ve (kupon istiyorsa) indirimdeki satır indirim almaz, nedeni yazılır", () => {
    const satirlar = [
      satir(10_000),
      satir(10_000, { kapsamda: false }),
      satir(10_000, { indirimde: true }),
    ];
    expect(kuponuUygula(kupon(), satirlar, durum())).toEqual({
      gecti: true,
      indirimler: [1_000, 0, 1_000],
      ucretsizKargo: false,
      disarida: [null, "kapsam", null],
    });
    expect(kuponuUygula(kupon({ indirimdeGecmez: true }), satirlar, durum())).toEqual({
      gecti: true,
      indirimler: [1_000, 0, 0],
      ucretsizKargo: false,
      disarida: [null, "kapsam", "indirimli"],
    });
  });

  it("ücretsiz kargo ürüne indirim yapmaz", () => {
    expect(
      kuponuUygula(kupon({ tur: "ucretsiz-kargo", deger: 0 }), [satir(5_000)], durum()),
    ).toEqual({ gecti: true, indirimler: [0], ucretsizKargo: true, disarida: [null] });
  });
});

describe("kuponun geçerliliği", () => {
  const sepet = [satir(10_000)];

  it("yok ve kapalı kupon bulunamadı", () => {
    expect(kuponuUygula(undefined, sepet, durum())).toMatchObject({ neden: "bulunamadi" });
    expect(kuponuUygula(kupon({ acik: false }), sepet, durum())).toMatchObject({
      neden: "bulunamadi",
    });
  });

  it("başlangıçtan önce başlamadı, başladığı anda geçer; bitiş anında süresi doldu, bir milisaniye önce geçer", () => {
    const baslangic = new Date(an.getTime() + 1);
    expect(kuponuUygula(kupon({ baslangic }), sepet, durum())).toMatchObject({
      neden: "baslamadi",
    });
    expect(kuponuUygula(kupon({ baslangic: an }), sepet, durum())).toMatchObject({ gecti: true });
    expect(kuponuUygula(kupon({ bitis: an }), sepet, durum())).toMatchObject({
      neden: "suresi-doldu",
    });
    expect(
      kuponuUygula(kupon({ bitis: new Date(an.getTime() + 1) }), sepet, durum()),
    ).toMatchObject({ gecti: true });
  });

  it("toplam sınır dolunca geçmez; kişi başı sınır yalnız kişi bilinince sayılır", () => {
    expect(
      kuponuUygula(kupon({ toplamSinir: 5 }), sepet, durum({ toplamKullanim: 5 })),
    ).toMatchObject({ neden: "sinir-doldu" });
    expect(
      kuponuUygula(kupon({ toplamSinir: 5 }), sepet, durum({ toplamKullanim: 4 })),
    ).toMatchObject({ gecti: true });
    expect(kuponuUygula(kupon({ kisiBasiSinir: 1 }), sepet, durum())).toMatchObject({
      gecti: true,
    });
    expect(
      kuponuUygula(kupon({ kisiBasiSinir: 1 }), sepet, durum({ kisiKullanimi: 1 })),
    ).toMatchObject({ neden: "kullanildi" });
    expect(
      kuponuUygula(kupon({ kisiBasiSinir: 2 }), sepet, durum({ kisiKullanimi: 1 })),
    ).toMatchObject({ gecti: true });
  });

  it("kapsamda satır yoksa ürün yok; indirimdeki tek ürün de ürün yok sayılır", () => {
    expect(kuponuUygula(kupon(), [satir(10_000, { kapsamda: false })], durum())).toMatchObject({
      neden: "urun-yok",
      disarida: ["kapsam"],
    });
    expect(
      kuponuUygula(kupon({ indirimdeGecmez: true }), [satir(10_000, { indirimde: true })], durum()),
    ).toMatchObject({ neden: "urun-yok", disarida: ["indirimli"] });
  });

  it("en az tutar: eşit tutar geçer, bir kuruş eksik kalanla geçmez", () => {
    expect(
      kuponuUygula(kupon({ enAzTutar: 50_000 }), sepet, durum({ araToplam: 50_000 })),
    ).toMatchObject({ gecti: true });
    expect(
      kuponuUygula(kupon({ enAzTutar: 50_000 }), sepet, durum({ araToplam: 49_999 })),
    ).toMatchObject({ gecti: false, neden: "en-az", kalan: 1 });
  });

  it("ilk tutmayan neden söylenir", () => {
    const hepsi = kupon({
      bitis: an,
      toplamSinir: 1,
      kisiBasiSinir: 1,
      enAzTutar: 1_000_000,
    });
    expect(
      kuponuUygula(
        hepsi,
        [satir(1, { kapsamda: false })],
        durum({ toplamKullanim: 1, kisiKullanimi: 1 }),
      ),
    ).toMatchObject({ neden: "suresi-doldu" });
    expect(
      kuponuUygula(
        { ...hepsi, bitis: null },
        [satir(1, { kapsamda: false })],
        durum({ toplamKullanim: 1, kisiKullanimi: 1 }),
      ),
    ).toMatchObject({ neden: "sinir-doldu" });
    expect(
      kuponuUygula(
        { ...hepsi, bitis: null, toplamSinir: null },
        [satir(1, { kapsamda: false })],
        durum({ kisiKullanimi: 1 }),
      ),
    ).toMatchObject({ neden: "kullanildi" });
    expect(
      kuponuUygula(
        { ...hepsi, bitis: null, toplamSinir: null, kisiBasiSinir: null },
        [satir(1, { kapsamda: false })],
        durum(),
      ),
    ).toMatchObject({ neden: "urun-yok" });
  });
});
