// Vergi hesabı elle hesaplanmış örneklerle (kart 0075, karar 0061). Veritabanı gerektirmez.
// Her örneğin hesabı yanında yazılıdır. Tutarlar kuruştur, oranlar milyonda bir birimindedir.
// Deneme oranları bilerek sitelerinkinden farklıdır (cekirdek/testler/vergi-degeri-yok.test.ts).
import { describe, expect, it } from "vitest";
import { BilinenHata } from "../../../kapi/zarf.ts";
import { type HesapAyarlari, type HesapGirdisi, hesapla, type VergiBolgesi } from "../hesap.ts";
import { yuzdedenOrana } from "../semalar.ts";
import type { VergiOrani, VergiSinifi } from "../servis.ts";

const oran = (yuzde: string) => {
  const deger = yuzdedenOrana(yuzde);
  if (deger === undefined) throw new Error(yuzde);
  return deger;
};

let sayac = 0;
const oranSatiri = (
  sinif: string,
  yuzde: string,
  bolge: VergiBolgesi,
  ek: Partial<VergiOrani> = {},
): VergiOrani => ({
  kimlik: `oran-${++sayac}`,
  sinifKimligi: sinif,
  ...bolge,
  oran: oran(yuzde),
  sira: 0,
  ...ek,
});

const sinif = (
  kimlik: string,
  oranlar: VergiOrani[],
  ek: Partial<VergiSinifi> = {},
): VergiSinifi => ({ kimlik, ad: kimlik, sira: 0, silindi: false, kargo: false, oranlar, ...ek });

const tr = { ulke: "TR" };
const genel = sinif("genel", [oranSatiri("genel", "18", tr)]);
const ikili = sinif("ikili", [
  oranSatiri("ikili", "18", tr),
  oranSatiri("ikili", "2", tr, { ad: "Ek vergi", sira: 1 }),
]);

const ayarlar = (ek: Partial<HesapAyarlari> = {}): HesapAyarlari => ({
  vergiAcik: true,
  vergiAdi: "Deneme vergisi",
  fiyatGirisi: "vergi-haric",
  vergiAdresi: "teslimat",
  vergiYuvarlama: "satir",
  ...ek,
});

const magazaAdresi: VergiBolgesi = { ulke: "TR", il: "TR-06", postaKodu: "06000" };
const girdi = (ek: Partial<HesapGirdisi>): HesapGirdisi => ({
  ayarlar: ayarlar(),
  tablo: [genel, ikili],
  adresler: { teslimat: { ulke: "TR", il: "TR-34" }, magaza: magazaAdresi },
  satirlar: [],
  ...ek,
});

const kalem = (vergisiz: number, vergi: number) => ({ vergisiz, vergi, vergili: vergisiz + vergi });
const ozet = (sonuc: ReturnType<typeof hesapla>) => sonuc.satirlar.map(({ oranlar: _, ...k }) => k);

describe("vergi dahil ve hariç giriş", () => {
  it("hariç: 3 adet × 33,33, %18 → 9999 × 0,18 = 1799,82 → 1800", () => {
    const sonuc = hesapla(girdi({ satirlar: [{ birimFiyat: 3333, adet: 3, sinif: "genel" }] }));
    expect(ozet(sonuc)).toEqual([kalem(9999, 1800)]);
    expect(sonuc.toplam).toEqual(kalem(9999, 1800));
    expect(sonuc.dokum).toEqual([
      { ad: "Deneme vergisi", oran: oran("18"), matrah: 9999, vergi: 1800 },
    ]);
  });

  it("dahil: 3 adet × 33,33, %18 → 9999 × 18 / 118 = 1525,27 → 1525, vergisiz 8474", () => {
    const sonuc = hesapla(
      girdi({
        ayarlar: ayarlar({ fiyatGirisi: "vergi-dahil" }),
        satirlar: [{ birimFiyat: 3333, adet: 3, sinif: "genel" }],
      }),
    );
    expect(ozet(sonuc)).toEqual([kalem(8474, 1525)]);
    expect(sonuc.toplam.vergili).toBe(9999);
  });

  it("yarım kuruş yukarı yuvarlanır: dahil 123,45, %18 + %2 → 12345 / 6 = 2057,5 → 2058", () => {
    const sonuc = hesapla(
      girdi({
        ayarlar: ayarlar({ fiyatGirisi: "vergi-dahil" }),
        satirlar: [{ birimFiyat: 12345, adet: 1, sinif: "ikili" }],
      }),
    );
    // 2058 oranlara 18:2 paylaşılır: 1852,2 ve 205,8 → 1852 ve 205, artan 1 kuruş küsuratı büyüğe → 206.
    expect(ozet(sonuc)).toEqual([kalem(10287, 2058)]);
    expect(sonuc.dokum).toEqual([
      { ad: "Deneme vergisi", oran: oran("18"), matrah: 10287, vergi: 1852 },
      { ad: "Ek vergi", oran: oran("2"), matrah: 10287, vergi: 206 },
    ]);
  });

  it("hariç, aynı bölgede iki oran: 123,45 → %18 2222,1 → 2222, %2 246,9 → 247", () => {
    const sonuc = hesapla(girdi({ satirlar: [{ birimFiyat: 12345, adet: 1, sinif: "ikili" }] }));
    expect(ozet(sonuc)).toEqual([kalem(12345, 2469)]);
    expect(sonuc.satirlar[0]?.oranlar.map((o) => [o.ad, o.vergi])).toEqual([
      ["Deneme vergisi", 2222],
      ["Ek vergi", 247],
    ]);
  });
});

describe("satır ve ara toplam yuvarlaması", () => {
  const ucSatir = [1, 2, 3].map(() => ({ birimFiyat: 3333, adet: 1, sinif: "genel" }));

  it("dahil, üç ayrı 33,33 satırı: satır satır 3 × (3333 × 18 / 118 = 508,42 → 508) = 1524", () => {
    const sonuc = hesapla(
      girdi({ ayarlar: ayarlar({ fiyatGirisi: "vergi-dahil" }), satirlar: ucSatir }),
    );
    expect(ozet(sonuc)).toEqual([kalem(2825, 508), kalem(2825, 508), kalem(2825, 508)]);
    expect(sonuc.toplam).toEqual(kalem(8475, 1524));
  });

  it("dahil, aynı üç satır ara toplamda: 9999 → 1525; 1 kuruş fark ilk satıra", () => {
    const sonuc = hesapla(
      girdi({
        ayarlar: ayarlar({ fiyatGirisi: "vergi-dahil", vergiYuvarlama: "ara-toplam" }),
        satirlar: ucSatir,
      }),
    );
    expect(ozet(sonuc)).toEqual([kalem(2824, 509), kalem(2825, 508), kalem(2825, 508)]);
    expect(sonuc.toplam).toEqual(kalem(8474, 1525));
  });

  it("hariç, üç 2,75 kalem (biri kargo): satır 3 × 49,5 → 3 × 50 = 150; ara toplam 148,5 → 149", () => {
    const tablo = [sinif("genel", genel.oranlar, { kargo: true })];
    const ortak = {
      tablo,
      satirlar: [1, 2].map(() => ({ birimFiyat: 275, adet: 1, sinif: "genel" })),
      kargo: { tutar: 275 },
    };
    const satir = hesapla(girdi(ortak));
    expect(satir.toplam.vergi).toBe(150);
    const araToplam = hesapla(
      girdi({ ...ortak, ayarlar: ayarlar({ vergiYuvarlama: "ara-toplam" }) }),
    );
    expect(araToplam.toplam).toEqual(kalem(825, 149));
    // 149 üç eşit kaleme: 49'ar, artan 2 kuruş ilk ikisine.
    expect([...ozet(araToplam), araToplam.kargo?.vergi]).toEqual([
      kalem(275, 50),
      kalem(275, 50),
      49,
    ]);
    expect(araToplam.dokum).toEqual([
      { ad: "Deneme vergisi", oran: oran("18"), matrah: 825, vergi: 149 },
    ]);
  });

  it("ara toplamda aynı yüzdedeki farklı sınıflar birlikte yuvarlanır: 550 × 0,18 = 99", () => {
    const giyim = sinif("giyim", [oranSatiri("giyim", "18", tr)]);
    const sonuc = hesapla(
      girdi({
        ayarlar: ayarlar({ vergiYuvarlama: "ara-toplam" }),
        tablo: [genel, giyim],
        satirlar: [
          { birimFiyat: 275, adet: 1, sinif: "genel" },
          { birimFiyat: 275, adet: 1, sinif: "giyim" },
        ],
      }),
    );
    expect(sonuc.dokum).toEqual([
      { ad: "Deneme vergisi", oran: oran("18"), matrah: 550, vergi: 99 },
    ]);
    expect(ozet(sonuc)).toEqual([kalem(275, 50), kalem(275, 49)]);
  });

  it("bir kaleme aynı ad ve yüzdede iki oran uygulanırsa döküm iki satırdır, matrah iki kez sayılmaz", () => {
    const cift = sinif("cift", [
      oranSatiri("cift", "5", tr),
      oranSatiri("cift", "5", tr, { sira: 1 }),
    ]);
    const sonuc = hesapla(
      girdi({ tablo: [cift], satirlar: [{ birimFiyat: 1000, adet: 1, sinif: "cift" }] }),
    );
    expect(sonuc.dokum).toEqual([
      { ad: "Deneme vergisi", oran: oran("5"), matrah: 1000, vergi: 50 },
      { ad: "Deneme vergisi", oran: oran("5"), matrah: 1000, vergi: 50 },
    ]);
  });

  it("ara toplamda oran kümesi farklı kalemler ayrı yuvarlanır", () => {
    // genel: 275 × 0,18 = 49,5 → 50; ikili: %18 49,5 → 50 ve %2 5,5 → 6. İki grup ayrı yuvarlanır.
    const sonuc = hesapla(
      girdi({
        ayarlar: ayarlar({ vergiYuvarlama: "ara-toplam" }),
        satirlar: [
          { birimFiyat: 275, adet: 1, sinif: "genel" },
          { birimFiyat: 275, adet: 1, sinif: "ikili" },
        ],
      }),
    );
    expect(ozet(sonuc)).toEqual([kalem(275, 50), kalem(275, 56)]);
    // Döküm aynı ad ve oranı birleştirir: iki sınıfın %18'i tek satır.
    expect(sonuc.dokum).toEqual([
      { ad: "Deneme vergisi", oran: oran("18"), matrah: 550, vergi: 100 },
      { ad: "Ek vergi", oran: oran("2"), matrah: 275, vergi: 6 },
    ]);
  });
});

describe("vergisiz ürün, kargo, silinmiş sınıf, vergi kapalı", () => {
  it("vergisiz ürün vergi almaz, dökümde yer almaz", () => {
    const sonuc = hesapla(
      girdi({
        satirlar: [
          { birimFiyat: 4500, adet: 2, sinif: null },
          { birimFiyat: 3333, adet: 3, sinif: "genel" },
        ],
      }),
    );
    expect(ozet(sonuc)).toEqual([kalem(9000, 0), kalem(9999, 1800)]);
    expect(sonuc.dokum.map((satir) => satir.matrah)).toEqual([9999]);
  });

  it("kargo, kargo sınıfının oranıyla vergilenir: dahil 29,90 → 2990 × 18 / 118 = 456,10 → 456", () => {
    const sonuc = hesapla(
      girdi({
        ayarlar: ayarlar({ fiyatGirisi: "vergi-dahil" }),
        tablo: [sinif("genel", genel.oranlar, { kargo: true })],
        kargo: { tutar: 2990 },
      }),
    );
    expect(sonuc.kargo).toMatchObject(kalem(2534, 456));
    expect(sonuc.toplam).toEqual(kalem(2534, 456));
  });

  it("kargo sınıfı yoksa kargo vergisizdir", () => {
    const sonuc = hesapla(girdi({ kargo: { tutar: 2990 } }));
    expect(sonuc.kargo).toEqual({ ...kalem(2990, 0), oranlar: [] });
    expect(sonuc.bolge).toBe("yok");
  });

  it("silinmiş sınıf kendi oranlarıyla hesaplanır", () => {
    const silinmis = sinif("eski", [oranSatiri("eski", "8", tr)], { silindi: true });
    const sonuc = hesapla(
      girdi({ tablo: [genel, silinmis], satirlar: [{ birimFiyat: 5000, adet: 1, sinif: "eski" }] }),
    );
    expect(ozet(sonuc)).toEqual([kalem(5000, 400)]);
  });

  it("vergi kapalıysa vergi sıfır, döküm boş, fiyat girişi ne olursa olsun tutar aynı kalır", () => {
    for (const fiyatGirisi of ["vergi-dahil", "vergi-haric"] as const) {
      const sonuc = hesapla(
        girdi({
          ayarlar: ayarlar({ vergiAcik: false, fiyatGirisi }),
          adresler: {},
          satirlar: [{ birimFiyat: 3333, adet: 3, sinif: "genel" }],
          kargo: { tutar: 990 },
        }),
      );
      expect(sonuc.toplam).toEqual(kalem(10_989, 0));
      expect(sonuc.dokum).toEqual([]);
      expect(sonuc.bolge).toBe("yok");
    }
  });

  it("oranın adı yoksa ve vergi adı da boşsa döküm satırı adsızdır", () => {
    const sonuc = hesapla(
      girdi({
        ayarlar: ayarlar({ vergiAdi: undefined }),
        satirlar: [{ birimFiyat: 1000, adet: 1, sinif: "genel" }],
      }),
    );
    expect(sonuc.dokum).toEqual([{ oran: oran("18"), matrah: 1000, vergi: 180 }]);
  });
});

describe("bölge", () => {
  const ilOrani = sinif("il", [
    oranSatiri("il", "18", tr),
    oranSatiri("il", "8", { ulke: "TR", il: "TR-34" }),
    oranSatiri("il", "5", { ulke: "TR", il: "TR-34", postaKodu: "34000" }),
  ]);
  const sonucOrani = (teslimat: VergiBolgesi) =>
    hesapla(
      girdi({
        tablo: [ilOrani],
        adresler: { teslimat, magaza: magazaAdresi },
        satirlar: [{ birimFiyat: 1000, adet: 1, sinif: "il" }],
      }),
    ).satirlar[0]?.vergi;

  it("en özel oran geçer: posta kodu ve il, sonra il, sonra ülke", () => {
    expect(sonucOrani({ ulke: "TR", il: "TR-34", postaKodu: "34000" })).toBe(50);
    expect(sonucOrani({ ulke: "TR", il: "TR-34", postaKodu: "34100" })).toBe(80);
    expect(sonucOrani({ ulke: "TR", il: "TR-06", postaKodu: "34000" })).toBe(180);
  });

  it("posta kodu düzeyi tektir: ilsiz ve illi posta kodu oranları toplanır, il oranı geçmez", () => {
    const postali = sinif("postali", [
      oranSatiri("postali", "8", { ulke: "TR", il: "TR-34" }),
      oranSatiri("postali", "3", { ulke: "TR", postaKodu: "34000" }),
      oranSatiri("postali", "4", { ulke: "TR", il: "TR-34", postaKodu: "34000" }, { sira: 1 }),
    ]);
    const sonuc = hesapla(
      girdi({
        tablo: [postali],
        adresler: { teslimat: { ulke: "TR", il: "TR-34", postaKodu: "34000" } },
        satirlar: [{ birimFiyat: 1000, adet: 1, sinif: "postali" }],
      }),
    );
    // 1000 × (%3 + %4) = 30 + 40.
    expect(sonuc.satirlar[0]?.oranlar.map((o) => o.vergi)).toEqual([30, 40]);
  });

  it("mağaza adresi seçiliyse müşterinin adresine bakılmaz", () => {
    const sonuc = hesapla(
      girdi({
        ayarlar: ayarlar({ vergiAdresi: "magaza" }),
        tablo: [ilOrani],
        adresler: { teslimat: { ulke: "TR", il: "TR-34" }, magaza: magazaAdresi },
        satirlar: [{ birimFiyat: 1000, adet: 1, sinif: "il" }],
      }),
    );
    expect([sonuc.bolge, sonuc.satirlar[0]?.vergi]).toEqual(["magaza", 180]);
  });

  it("silinmiş sınıfın kalmış oranı bölgeyi bulunmuş saydırmaz", () => {
    const eski = sinif("eski", [oranSatiri("eski", "19", { ulke: "DE" })], { silindi: true });
    const sonuc = hesapla(
      girdi({
        tablo: [genel, eski],
        adresler: { teslimat: { ulke: "DE" }, magaza: magazaAdresi },
        satirlar: [{ birimFiyat: 1000, adet: 1, sinif: "genel" }],
      }),
    );
    expect([sonuc.bolge, sonuc.satirlar[0]?.vergi]).toEqual(["magaza", 180]);
  });

  it("ayardaki adres kullanılır: fatura adresi seçiliyse teslimat adresine bakılmaz", () => {
    const sonuc = hesapla(
      girdi({
        ayarlar: ayarlar({ vergiAdresi: "fatura" }),
        tablo: [ilOrani],
        adresler: {
          teslimat: { ulke: "TR", il: "TR-34" },
          fatura: { ulke: "TR", il: "TR-06" },
          magaza: magazaAdresi,
        },
        satirlar: [{ birimFiyat: 1000, adet: 1, sinif: "il" }],
      }),
    );
    expect([sonuc.bolge, sonuc.satirlar[0]?.vergi]).toEqual(["fatura", 180]);
  });

  it("bölgesi tabloda bulunamayan adreste mağaza adresinin oranı kullanılır", () => {
    const sonuc = hesapla(
      girdi({
        adresler: { teslimat: { ulke: "DE" }, magaza: magazaAdresi },
        satirlar: [{ birimFiyat: 1000, adet: 1, sinif: "genel" }],
      }),
    );
    expect([sonuc.bolge, sonuc.satirlar[0]?.vergi]).toEqual(["magaza", 180]);
    const adressiz = hesapla(
      girdi({
        adresler: { magaza: magazaAdresi },
        satirlar: [{ birimFiyat: 1000, adet: 1, sinif: "genel" }],
      }),
    );
    expect([adressiz.bolge, adressiz.satirlar[0]?.vergi]).toEqual(["magaza", 180]);
  });

  it("bölge tablodaysa ama sınıfın orada oranı yoksa o ürüne vergi uygulanmaz", () => {
    const iki = sinif("iki-ulke", [
      oranSatiri("iki-ulke", "18", tr),
      oranSatiri("iki-ulke", "19", { ulke: "DE" }),
    ]);
    const sonuc = hesapla(
      girdi({
        tablo: [genel, iki],
        adresler: { teslimat: { ulke: "DE" }, magaza: magazaAdresi },
        satirlar: [
          { birimFiyat: 1000, adet: 1, sinif: "genel" },
          { birimFiyat: 1000, adet: 1, sinif: "iki-ulke" },
        ],
      }),
    );
    expect(sonuc.bolge).toBe("teslimat");
    expect(ozet(sonuc)).toEqual([kalem(1000, 0), kalem(1000, 190)]);
  });

  it("ne müşterinin ne mağazanın bölgesi tablodaysa hesap durur; yalnız vergisiz kalemle durmaz", () => {
    const bolgesiz = { teslimat: { ulke: "DE" }, magaza: { ulke: "FR" } };
    let hata: unknown;
    try {
      hesapla(
        girdi({ adresler: bolgesiz, satirlar: [{ birimFiyat: 1000, adet: 1, sinif: "genel" }] }),
      );
    } catch (yakalanan) {
      hata = yakalanan;
    }
    expect(hata).toBeInstanceOf(BilinenHata);
    expect((hata as BilinenHata).ayrinti).toEqual({ kod: "vergi-bolgesi-yok" });
    expect(() =>
      hesapla(girdi({ adresler: {}, satirlar: [{ birimFiyat: 1000, adet: 1, sinif: null }] })),
    ).not.toThrow();
    // Sıfır oranlı sınıftaki ürün vergisiz ürün değildir: bölge yoksa hesap yine durur (kullanıcı kararı).
    const sifir = sinif("sifir", [oranSatiri("sifir", "0", tr)]);
    expect(() =>
      hesapla(
        girdi({
          tablo: [sifir],
          adresler: bolgesiz,
          satirlar: [{ birimFiyat: 1000, adet: 1, sinif: "sifir" }],
        }),
      ),
    ).toThrow(BilinenHata);
  });
});

describe("girdi ve sınırlar", () => {
  it("tabloda olmayan sınıf, kesirli ya da eksi tutar ve sıfır adet hata verir", () => {
    const tek = (satir: HesapGirdisi["satirlar"][number]) => () =>
      hesapla(girdi({ satirlar: [satir] }));
    expect(tek({ birimFiyat: 1000, adet: 1, sinif: "olmayan" })).toThrow("tabloda yok");
    expect(tek({ birimFiyat: 10.5, adet: 1, sinif: "genel" })).toThrow();
    expect(tek({ birimFiyat: -1, adet: 1, sinif: "genel" })).toThrow();
    expect(tek({ birimFiyat: 1000, adet: 0, sinif: "genel" })).toThrow();
    expect(() => hesapla(girdi({ kargo: { tutar: -5 } }))).toThrow();
  });

  it("güvenli tam sayı sınırını aşan sonuç sessizce bozulmaz, hata verir", () => {
    expect(() =>
      hesapla(
        girdi({ satirlar: [{ birimFiyat: Number.MAX_SAFE_INTEGER, adet: 1, sinif: "genel" }] }),
      ),
    ).toThrow("güvenli tam sayı");
  });

  it("her rastgele girdide kalemler, döküm ve toplam birbirini tutar", () => {
    // Basit tohumlu sayı üreteci: test her çalışmada aynı girdileri dener.
    let tohum = 7;
    const rastgele = (ust: number) => {
      tohum = (tohum * 48_271) % 2_147_483_647;
      return tohum % ust;
    };
    for (let deneme = 0; deneme < 300; deneme++) {
      const dahil = rastgele(2) === 0;
      const sonuc = hesapla(
        girdi({
          ayarlar: ayarlar({
            fiyatGirisi: dahil ? "vergi-dahil" : "vergi-haric",
            vergiYuvarlama: rastgele(2) === 0 ? "satir" : "ara-toplam",
          }),
          tablo: [sinif("genel", genel.oranlar, { kargo: true }), ikili],
          satirlar: Array.from({ length: 1 + rastgele(6) }, () => ({
            birimFiyat: rastgele(1_000_000),
            adet: 1 + rastgele(9),
            sinif: ["genel", "ikili", null][rastgele(3)] ?? null,
          })),
          kargo: { tutar: rastgele(5000) },
        }),
      );
      const kalemler = [...sonuc.satirlar, ...(sonuc.kargo ? [sonuc.kargo] : [])];
      for (const k of kalemler) {
        expect(k.vergisiz + k.vergi).toBe(k.vergili);
        expect(k.oranlar.reduce((t, o) => t + o.vergi, 0)).toBe(k.vergi);
        expect(k.vergi).toBeGreaterThanOrEqual(0);
      }
      const toplamVergi = kalemler.reduce((t, k) => t + k.vergi, 0);
      expect(sonuc.toplam.vergi).toBe(toplamVergi);
      expect(sonuc.dokum.reduce((t, d) => t + d.vergi, 0)).toBe(toplamVergi);
      expect(sonuc.toplam.vergisiz + sonuc.toplam.vergi).toBe(sonuc.toplam.vergili);
    }
  });
});
