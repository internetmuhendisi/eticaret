// Ürün ekranının fiyat ve stok girdisi (kart 0265): yalnız değişen satır gider; ortak indirim zamanı değişince
// indirimli fiyatı olan satır da gider; zaman yalnız fiyat satırıyla, sebep ve not yalnız stok satırıyla gider; yeni
// basit ürünün dolu fiyatı ve başlangıç stoğu ("Yeni mal geldi") gider; birleşimin stoğu sunucudaki miktarıyla
// (görülen) gider; basitten dönen ilk satır basit birimin fiyatı ve stoğuyla karşılaştırılır.
import { describe, expect, it } from "vitest";
import { fiyatStokGirdisi, urunFormunuUzlastir } from "../urunler/fiyat-stok-formu";
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
  galeri: [],
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
  videoSiteleri: [],
  dosyaSinirlari: { boyut: "10 MB", turler: "JPEG" },
  bicim: {
    dil: "tr",
    saatDilimi: "Europe/Istanbul",
    sayi: { binlikAyirici: ".", ondalikAyirici: "," },
    para: {
      paraBirimi: "XTS",
      simge: "¤",
      simgeYeri: "sonda",
      simgeBoslugu: true,
      ondalikSayisi: 2,
    },
  },
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
      birimler: [{ yer: "fiyat", birim: "b0", satisFiyati: "120,00", indirimliFiyat: "80,00" }],
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
        { yer: "fiyat", satisFiyati: "100,00", indirimliFiyat: "80,00", ortakZaman: true },
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
  const vVeri = veri({
    tur: "varyantli",
    fiyatStok: {
      ...veri().fiyatStok,
      birimler: {
        [birlesimAnahtari(["s"])]: {
          kimlik: "bs",
          satisFiyati: "100,00",
          indirimliFiyat: "",
          stok: 4,
          ayrilan: 0,
        },
        [birlesimAnahtari(["m"])]: {
          kimlik: "bm",
          satisFiyati: "120,00",
          indirimliFiyat: "90,00",
          stok: 2,
          ayrilan: 0,
        },
      },
    },
  });
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
      birimler: [
        { yer: "birlesimler.1", birlesim: [1], birim: "bm", stok: { gorulen: 2, yeni: "1" } },
      ],
    });
    // Ortak zaman: yalnız indirimli birleşim gider, sebep gitmez.
    expect(
      girdi({ ...bilinen, fiyat: { ...bosFiyat, indirimBaslangici: "2030-01-01T00:00" } }),
    ).toEqual({
      indirimBaslangici: "2030-01-01T00:00",
      indirimBitisi: null,
      birimler: [
        {
          yer: "birlesimler.1",
          birlesim: [1],
          birim: "bm",
          satisFiyati: "120,00",
          indirimliFiyat: "90,00",
          ortakZaman: true,
        },
      ],
    });
    // Yalnız satış fiyatı değişen indirimli satır ortak zamanı almaz: kendi zamanı kalır.
    expect(
      girdi({
        ...bilinen,
        varyant: varyant(
          alan({ satisFiyati: "100,00", stok: "4" }),
          alan({ satisFiyati: "130,00", indirimliFiyat: "90,00", stok: "2" }),
        ),
      })?.birimler,
    ).toEqual([
      {
        yer: "birlesimler.1",
        birlesim: [1],
        birim: "bm",
        satisFiyati: "130,00",
        indirimliFiyat: "90,00",
      },
    ]);
  });

  it("yalnız indirimli fiyatı yazılan satır da gider (sunucu satış fiyatının gerektiğini söyler)", () => {
    expect(
      girdi({
        ...bilinen,
        varyant: varyant(
          alan({ satisFiyati: "100,00", stok: "4" }),
          alan({ satisFiyati: "120,00", indirimliFiyat: "90,00", stok: "2" }),
        ),
        fiyat: bosFiyat,
      }),
    ).toBeUndefined();
    const bos = { ...bilinen, varyant: varyant(alan(), alan()) };
    expect(
      fiyatStokGirdisi(
        { ...bos, varyant: varyant(alan({ indirimliFiyat: "50,00" }), alan()) },
        bos,
        vVeri,
        birlesimSatirlari(
          varyant(alan({ indirimliFiyat: "50,00" }), alan()),
          bos.varyant,
          undefined,
        ),
      )?.birimler,
    ).toMatchObject([{ yer: "birlesimler.0", satisFiyati: "", indirimliFiyat: "50,00" }]);
  });

  it("yeni varyantlı ürünün ilk stokları 'Yeni mal geldi' ile gider, seçilen sebep değil", () => {
    const yeniVeri = veri({ kimlik: undefined } as Partial<UrunEkraniVerisi>);
    delete yeniVeri.kimlik;
    const bos = { ...form, fiyat: bosFiyat, varyant: { secenekler: [], birlesimler: {} } };
    const f = {
      ...bos,
      stokSebebi: "sayim" as const,
      varyant: varyant(alan({ stok: "3" }), alan()),
    };
    expect(
      fiyatStokGirdisi(f, bos, yeniVeri, birlesimSatirlari(f.varyant, bos.varyant, undefined))
        ?.sebep,
    ).toBe("yeni-mal");
  });

  it("sayfa yenilenince dokunulmayan stok sunucunun yeni miktarını alır, sunucuda değişen stok güncel görünür", () => {
    // A ve B 5; kullanıcı A'yı 10 yaptı; bu arada sipariş ikisini de 4'e düşürdü ve sayfa yenilendi.
    const eski = { ...bilinen, varyant: varyant(alan({ stok: "5" }), alan({ stok: "5" })) };
    const sunucu = { ...bilinen, varyant: varyant(alan({ stok: "4" }), alan({ stok: "4" })) };
    const formda = {
      ...eski,
      kisaAciklama: "Yeni",
      varyant: varyant(alan({ stok: "10" }), alan({ stok: "5" })),
    };
    const birlesik = urunFormunuUzlastir(formda, eski, sunucu);
    // Kullanıcının başka değişikliği kalır; iki stok sunucunun miktarıdır, hiçbir stok satırı gitmez.
    expect(birlesik.kisaAciklama).toBe("Yeni");
    expect(birlesik.varyant.birlesimler[birlesimAnahtari(["m"])]?.stok).toBe("4");
    expect(birlesik.varyant.birlesimler[birlesimAnahtari(["s"])]?.stok).toBe("4");
    expect(
      fiyatStokGirdisi(
        birlesik,
        sunucu,
        vVeri,
        birlesimSatirlari(birlesik.varyant, sunucu.varyant, undefined),
      ),
    ).toBeUndefined();
    // Sunucuda değişmeyen stoğa dokunulduysa kullanıcının sayısı kalır ve gördüğü miktarla gider.
    // Başka bir yöneticinin değiştirdiği, kullanıcının dokunmadığı alan (ağırlık, M'nin fiyatı) yeni değeri alır.
    const sunucu2 = {
      ...bilinen,
      kisaAciklama: "Başkası",
      agirlik: "1,5",
      varyant: varyant(alan({ stok: "5" }), alan({ stok: "5", satisFiyati: "99,00" })),
    };
    const birlesik2 = urunFormunuUzlastir(formda, eski, sunucu2);
    expect(birlesik2.varyant.birlesimler[birlesimAnahtari(["s"])]?.stok).toBe("10");
    expect(birlesik2.varyant.birlesimler[birlesimAnahtari(["m"])]?.satisFiyati).toBe("99,00");
    expect(birlesik2.agirlik).toBe("1,5");
    expect(birlesik2.kisaAciklama).toBe("Yeni");
  });

  it("basitten dönen ilk satır basit birimin sunucudaki fiyatıyla karşılaştırılır: formda değişen fiyat gider", () => {
    // Basit ürün (sunucuda 100,00 / 80,00, stok 9); fiyat formda 110,00 yapıldı, kaydedilmeden Beden seçeneği eklendi.
    // Dönen ilk satırın alanları formun fiyatını taşır; karşılaştırma sunucudakiyle olmalı, yoksa değişiklik kaybolur.
    const basit = { ...form };
    const ilk = { ...bosBirlesim, satisFiyati: "110,00", indirimliFiyat: "80,00", stok: "9" };
    // Yeni seçenek ve değerleri kimliksizdir (henüz kaydedilmedi).
    const v = varyant(ilk, alan({ satisFiyati: "100,00", stok: "3" }));
    const yeniVaryant: VaryantFormu = {
      ...v,
      secenekler: v.secenekler.map(({ kimlik: _k, ...secenek }) => ({
        ...secenek,
        degerler: secenek.degerler.map(({ kimlik: _d, ...deger }) => deger),
      })),
    };
    const yeni = {
      ...basit,
      fiyat: { ...basit.fiyat, satisFiyati: "110,00" },
      varyant: yeniVaryant,
    };
    const satirlar = birlesimSatirlari(yeni.varyant, basit.varyant, ilk);
    expect(fiyatStokGirdisi(yeni, basit, veri(), satirlar)?.birimler).toEqual([
      {
        yer: "birlesimler.0",
        birlesim: [0],
        birim: "b0",
        satisFiyati: "110,00",
        indirimliFiyat: "80,00",
      },
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

describe("galerinin uzlaştırılması (kart 0266)", () => {
  it("kayıt sürerken yüklenen görsel formda kalır, kaydedilmiş yeni görsel sunucudaki kimliği alır", () => {
    const d1 = "11111111-1111-4111-8111-111111111111";
    const d2 = "22222222-2222-4222-8222-222222222222";
    const k1 = "33333333-3333-4333-8333-333333333333";
    const gonderilen = {
      ...form,
      galeri: [{ anahtar: "yeni:1", tur: "gorsel" as const, alternatifMetin: "Ön", dosya: d1 }],
    };
    const formda = {
      ...gonderilen,
      galeri: [
        ...gonderilen.galeri,
        { anahtar: "yeni:2", tur: "gorsel" as const, alternatifMetin: "", dosya: d2 },
      ],
    };
    const sunucu = {
      ...form,
      galeri: [
        { anahtar: k1, kimlik: k1, tur: "gorsel" as const, alternatifMetin: "Ön", dosya: d1 },
      ],
    };
    const birlesik = urunFormunuUzlastir(formda, gonderilen, sunucu);
    expect(birlesik.galeri.map((oge) => [oge.kimlik, oge.dosya])).toEqual([
      [k1, d1],
      [undefined, d2],
    ]);
  });
});
