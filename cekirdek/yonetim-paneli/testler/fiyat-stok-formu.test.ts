// Ürün ekranının fiyat ve stok girdisi (kart 0265): yalnız değişen satır gider; ortak indirim zamanı değişince
// indirimli fiyatı olan satır da gider; zaman yalnız fiyat satırıyla, sebep ve not yalnız stok satırıyla gider; yeni
// basit ürünün dolu fiyatı ve başlangıç stoğu ("Yeni mal geldi") gider; birleşimin stoğu sunucudaki miktarıyla
// (görülen) gider; basitten dönen ilk satır basit birimin fiyatı ve stoğuyla karşılaştırılır.
import { describe, expect, it } from "vitest";
import { fiyatStokGirdisi } from "../urunler/fiyat-stok-formu";
import type { UrunEkraniVerisi, UrunFormu } from "../urunler/urun-verisi";
import {
  type BirlesimFormu,
  birlesimAnahtari,
  birlesimSatirlari,
  bosBirlesim,
  type VaryantFormu,
} from "../urunler/varyant-formu";

const bosFiyat = { satisFiyati: "", indirimliFiyat: "", indirimBaslangici: "", indirimBitisi: "" };
const form: UrunFormu = {
  ad: "Kupa",
  adresAdi: "kupa",
  kisaAciklama: "",
  uzunAciklama: "",
  kategoriler: [],
  marka: null,
  etiketler: [],
  vergiSinifi: "",
  kargoGerekmez: false,
  stokKodu: "",
  barkod: "",
  agirlik: "",
  enAzAdet: "1",
  enCokAdet: "",
  durum: "taslak",
  yayinZamani: "",
  ozellikler: {},
  ilgiliUrunler: [],
  varyant: { secenekler: [], birlesimler: {} },
  fiyat: { ...bosFiyat, satisFiyati: "100,00", indirimliFiyat: "80,00" },
  stokTakibi: true,
  dusukStokEsigi: "",
  baslangicStogu: "",
  stokSebebi: "sayim",
  stokNotu: "",
};
const veri = (ek: Partial<UrunEkraniVerisi> = {}): UrunEkraniVerisi => ({
  kimlik: "u1",
  form,
  tur: "basit",
  vergiSiniflari: [],
  ozellikler: [],
  agirlikBirimi: "kg",
  baslikAlti: [],
  galeriGorselleri: [],
  izinler: {
    degistir: true,
    sil: true,
    fiyatGor: true,
    fiyatDegistir: true,
    stokGor: true,
    stokDuzelt: true,
  },
  fiyatStok: {
    fiyatGirisi: "vergi-dahil",
    simge: "¤",
    simgeYeri: "sonda",
    magazaEsigi: 5,
    birimler: {
      "": { kimlik: "b0", satisFiyati: "100,00", indirimliFiyat: "80,00", stok: 9, ayrilan: 0 },
    },
    indirimBaslangici: "",
    indirimBitisi: "",
  },
  ...ek,
});
const satirsiz = (f: UrunFormu, b: UrunFormu, v: UrunEkraniVerisi) =>
  fiyatStokGirdisi(f, b, v, birlesimSatirlari(f.varyant, b.varyant, undefined));

describe("basit ürün", () => {
  it("değişmeyen fiyat gitmez; değişen satış fiyatı 'fiyat' satırıyla ve ortak zamanla gider", () => {
    expect(satirsiz(form, form, veri())).toBeUndefined();
    expect(
      satirsiz({ ...form, fiyat: { ...form.fiyat, satisFiyati: "120,00" } }, form, veri()),
    ).toEqual({
      indirimBaslangici: null,
      indirimBitisi: null,
      birimler: [{ yer: "fiyat", satisFiyati: "120,00", indirimliFiyat: "80,00" }],
    });
  });

  it("zaman değişince indirimli satır gider; indirimsiz üründe zaman tek başına gitmez", () => {
    const zamanli = { ...form, fiyat: { ...form.fiyat, indirimBitisi: "2030-01-01T00:00" } };
    expect(satirsiz(zamanli, form, veri())).toMatchObject({
      indirimBitisi: "2030-01-01T00:00",
      birimler: [{ yer: "fiyat" }],
    });
    const indirimsiz = { ...form, fiyat: { ...form.fiyat, indirimliFiyat: "" } };
    expect(
      satirsiz(
        { ...indirimsiz, fiyat: { ...indirimsiz.fiyat, indirimBitisi: "2030-01-01T00:00" } },
        indirimsiz,
        veri(),
      ),
    ).toBeUndefined();
  });

  it("yeni üründe dolu fiyat ve başlangıç stoğu gider, sebep 'yeni mal'; boş fiyat ve sıfır stok gitmez", () => {
    const yeniVeri = veri({ kimlik: undefined } as Partial<UrunEkraniVerisi>);
    delete yeniVeri.kimlik;
    const bos = { ...form, fiyat: bosFiyat };
    expect(satirsiz({ ...bos, baslangicStogu: "0" }, bos, yeniVeri)).toBeUndefined();
    expect(satirsiz({ ...form, baslangicStogu: "12", stokNotu: "Depo" }, form, yeniVeri)).toEqual({
      indirimBaslangici: null,
      indirimBitisi: null,
      sebep: "yeni-mal",
      not: "Depo",
      birimler: [
        { yer: "fiyat", satisFiyati: "100,00", indirimliFiyat: "80,00" },
        { yer: "stok", stok: { gorulen: 0, yeni: "12" } },
      ],
    });
  });
});

describe("seçenekli ürün", () => {
  const alan = (ek: Partial<BirlesimFormu> = {}): BirlesimFormu => ({ ...bosBirlesim, ...ek });
  const varyant = (s: BirlesimFormu, m: BirlesimFormu): VaryantFormu => ({
    secenekler: [
      {
        anahtar: "beden",
        kimlik: "beden",
        ad: "Beden",
        degerler: [
          { anahtar: "s", kimlik: "s", ad: "S" },
          { anahtar: "m", kimlik: "m", ad: "M" },
        ],
      },
    ],
    birlesimler: { [birlesimAnahtari(["s"])]: s, [birlesimAnahtari(["m"])]: m },
  });
  const kayitli = varyant(
    alan({ satisFiyati: "100,00", stok: "4" }),
    alan({ satisFiyati: "120,00", indirimliFiyat: "90,00", stok: "2" }),
  );
  const bilinen = { ...form, fiyat: bosFiyat, varyant: kayitli };
  const vVeri = veri({ tur: "varyantli" });
  const girdi = (f: UrunFormu, b: UrunFormu = bilinen) =>
    fiyatStokGirdisi(f, b, vVeri, birlesimSatirlari(f.varyant, b.varyant, undefined));

  it("yalnız değişen satır gider; stok sunucudaki miktarı görülen olarak taşır; sebep ve not yalnız stokla", () => {
    expect(girdi(bilinen)).toBeUndefined();
    expect(
      girdi({
        ...bilinen,
        stokSebebi: "hasar",
        stokNotu: "Kırık",
        varyant: varyant(
          alan({ satisFiyati: "100,00", stok: "4" }),
          alan({ satisFiyati: "120,00", indirimliFiyat: "90,00", stok: "1" }),
        ),
      }),
    ).toEqual({
      sebep: "hasar",
      not: "Kırık",
      birimler: [{ yer: "birlesimler.1", birlesim: [1], stok: { gorulen: 2, yeni: "1" } }],
    });
    // Ortak zaman: yalnız indirimli birleşim gider, sebep gitmez.
    expect(
      girdi({ ...bilinen, fiyat: { ...bosFiyat, indirimBaslangici: "2030-01-01T00:00" } }),
    ).toEqual({
      indirimBaslangici: "2030-01-01T00:00",
      indirimBitisi: null,
      birimler: [
        { yer: "birlesimler.1", birlesim: [1], satisFiyati: "120,00", indirimliFiyat: "90,00" },
      ],
    });
  });

  it("basitten dönen ilk satır basit birimin fiyatı ve stoğuyla karşılaştırılır", () => {
    // Basit ürün (fiyat 100,00 / 80,00, stok 9) Beden seçeneği alıyor: ilk satır basit birimdir.
    const basit = { ...form };
    // Yeni seçenek ve değerleri kimliksizdir (henüz kaydedilmedi).
    const yeniVaryant = (s: BirlesimFormu, m: BirlesimFormu): VaryantFormu => {
      const v = varyant(s, m);
      return {
        ...v,
        secenekler: v.secenekler.map(({ kimlik: _k, ...secenek }) => ({
          ...secenek,
          degerler: secenek.degerler.map(({ kimlik: _d, ...deger }) => deger),
        })),
      };
    };
    const yeni = {
      ...basit,
      varyant: yeniVaryant(
        alan({ satisFiyati: "100,00", indirimliFiyat: "80,00", stok: "9" }),
        alan({ satisFiyati: "100,00", stok: "3" }),
      ),
    };
    const satirlar = birlesimSatirlari(yeni.varyant, basit.varyant, {
      ...bosBirlesim,
      satisFiyati: "100,00",
      indirimliFiyat: "80,00",
      stok: "9",
    });
    expect(fiyatStokGirdisi(yeni, basit, veri(), satirlar)?.birimler).toEqual([
      {
        yer: "birlesimler.1",
        birlesim: [1],
        satisFiyati: "100,00",
        indirimliFiyat: "",
        stok: { gorulen: 0, yeni: "3" },
      },
    ]);
  });
});
