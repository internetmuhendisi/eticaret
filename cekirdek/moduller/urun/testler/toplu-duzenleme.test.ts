// Ürünlerin toplu düzenlemesi (kart 0314, karar 0189). Hesap elle hesaplanmış örneklerle: oranın kuruşa yarım yukarı
// yuvarlanması, tutar, büyük tutar, sıfıra inen fiyat, indirimli fiyatın satıştan küçük kalması, indirimsiz ve
// fiyatsız birimin atlanması, stoğun eklenmesi, çıkarılması, çekilmesi, sıfırın altı ve üst sınır, takibi kapalı ürün;
// ekranın yazısının okunması ve hataları. Gerçek veritabanıyla: önizlemenin hiçbir şey yazmaması, birleşimlerin
// değer sırası ve adları; uygulamanın her birleşime yazması, fiyat ve stok geçmişine ve değişiklik kaydına yazanıyla
// girmesi; indirimin verilen zamanı ve boş zamanda birimin kayıtlı zamanının kalması; önizlemeden sonra değişen
// fiyat ve stokta "degisti" ve ötekilerin işlenmesi; kurala aykırı ürünün hiçbir birimine yazılmaması; kategoriye
// ekleme ve çıkarma, silinmiş kategori; silinmiş ürün; iki site.
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BilinenHata } from "../../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import { bicimleyiciOlustur } from "../../../metinler/bicimleyici.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { fiyatServisi } from "../../fiyat/servis.ts";
import { kategoriEkle, kategoriSil } from "../../kategori/servis.ts";
import { stokServisi } from "../../stok/servis.ts";
import { urunServisi } from "../servis.ts";
import {
  duzenlemeyiHazirla,
  type HazirDuzenleme,
  type TopluDuzenlemeGirdisi,
  topluDuzenlemeGirdisi,
  topluOnizle,
  topluUygula,
  tutaraUygula,
  yeniFiyat,
  yeniStok,
} from "../toplu-duzenleme.ts";

const saatDilimi = "Europe/Istanbul";
const servis = urunServisi(() => saatDilimi);
const fiyat = fiyatServisi(() => ({ saatDilimi, paraBirimi: "XTS" }));
const stok = stokServisi();
const bicimleyici = bicimleyiciOlustur({
  dil: "tr",
  saatDilimi,
  para: { paraBirimi: "XTS", simgeYeri: "sonda", simgeBoslugu: true, ondalikSayisi: 2 },
  sayi: { binlikAyirici: ".", ondalikAyirici: "," },
});
const kim: DegisikligiYapan = { tur: "yonetici", kimlik: randomUUID() };
const servisler = {
  fiyat,
  stok,
  urunDegistir: servis.urunDegistir,
  bicimleyici,
  saatDilimi,
  paraBirimi: "XTS",
};

const hazirla = (girdi: TopluDuzenlemeGirdisi) =>
  duzenlemeyiHazirla(topluDuzenlemeGirdisi.parse(girdi), bicimleyici, saatDilimi);
const fiyatDuzenlemesi = (
  ek: Partial<Extract<TopluDuzenlemeGirdisi, { islem: "fiyat" }>>,
): Extract<TopluDuzenlemeGirdisi, { islem: "fiyat" }> => ({
  islem: "fiyat",
  hedef: "satis",
  yontem: "artir",
  birim: "oran",
  deger: "10",
  ...ek,
});

const hatasi = (is: () => unknown) => {
  try {
    is();
  } catch (hata) {
    if (hata instanceof BilinenHata) return { kod: hata.kod, ayrinti: hata.ayrinti };
    throw hata;
  }
  throw new Error("Hata beklenirdi.");
};
const sozHatasi = async (is: Promise<unknown>) => {
  const hata = await is.then(
    () => undefined,
    (yakalanan: unknown) => yakalanan,
  );
  if (!(hata instanceof BilinenHata)) throw new Error(`Bilinen hata beklenirdi: ${String(hata)}`);
  return { kod: hata.kod, ayrinti: hata.ayrinti };
};

describe("hesap", () => {
  it("oran kuruşa yarım yukarı yuvarlanır; tutar eklenir ve çıkarılır; büyük tutar kaymaz", () => {
    // 249,90 × 0,85 = 212,415 → 212,42; 149,90 × 0,85 = 127,415 → 127,42; 0,01 × 1,5 = 0,015 → 0,02.
    expect(tutaraUygula(24990, "azalt", { birim: "oran", deger: 1500 })).toBe(21242);
    expect(tutaraUygula(14990, "azalt", { birim: "oran", deger: 1500 })).toBe(12742);
    expect(tutaraUygula(1, "artir", { birim: "oran", deger: 5000 })).toBe(2);
    // 99,99 × 1,125 = 112,48875 → 112,49.
    expect(tutaraUygula(9999, "artir", { birim: "oran", deger: 1250 })).toBe(11249);
    expect(tutaraUygula(10000, "artir", { birim: "tutar", deger: 2550 })).toBe(12550);
    expect(tutaraUygula(10000, "azalt", { birim: "tutar", deger: 2550 })).toBe(7450);
    // 9.007.199.254.740,94 × 1,1 = 9.907.919.180.215,034: kayan noktalı sayıyla ,04 çıkardı; tam sayıyla ,03.
    expect(Math.round(900_719_925_474_094 * 1.1)).toBe(990_791_918_021_504);
    expect(tutaraUygula(900_719_925_474_094, "artir", { birim: "oran", deger: 1000 })).toBe(
      990_791_918_021_503,
    );
    expect(tutaraUygula(10000, "azalt", { birim: "oran", deger: 10000 })).toBe(0);
  });

  const fiyatIsi = (ek: Partial<Extract<HazirDuzenleme, { islem: "fiyat" }>>) =>
    ({
      islem: "fiyat",
      hedef: "satis",
      yontem: "artir",
      degisim: { birim: "oran", deger: 1000 },
      indirimBaslangici: null,
      indirimBitisi: null,
      ...ek,
    }) as Extract<HazirDuzenleme, { islem: "fiyat" }>;

  it("fiyat: fiyatsız birim ve indirimsiz birimin indirimi atlanır; sıfıra inen ve satıştan küçük olmayan durdurur", () => {
    expect(yeniFiyat(undefined, fiyatIsi({}))).toEqual({ tur: "atla", neden: "fiyat-yok" });
    expect(yeniFiyat({ satis: 10000, indirimli: 8000 }, fiyatIsi({}))).toEqual({
      tur: "yeni",
      satis: 11000,
      indirimli: 8000,
    });
    // Satış fiyatı indirimli fiyatın altına inerse durur.
    expect(
      yeniFiyat(
        { satis: 10000, indirimli: 9000 },
        fiyatIsi({ yontem: "azalt", degisim: { birim: "oran", deger: 2000 } }),
      ),
    ).toEqual({ tur: "durdur", neden: "indirim-buyuk" });
    expect(
      yeniFiyat(
        { satis: 1000, indirimli: null },
        fiyatIsi({ yontem: "azalt", degisim: { birim: "tutar", deger: 1000 } }),
      ),
    ).toEqual({ tur: "durdur", neden: "sifira-iniyor" });
    const indirimli = (yontem: "artir" | "azalt" | "satistan-indir", deger: number) =>
      fiyatIsi({ hedef: "indirimli", yontem, degisim: { birim: "oran", deger } });
    expect(yeniFiyat({ satis: 10000, indirimli: null }, indirimli("artir", 1000))).toEqual({
      tur: "atla",
      neden: "indirim-yok",
    });
    expect(yeniFiyat({ satis: 10000, indirimli: null }, indirimli("satistan-indir", 1500))).toEqual(
      { tur: "yeni", satis: 10000, indirimli: 8500 },
    );
    expect(yeniFiyat({ satis: 10000, indirimli: 9000 }, indirimli("artir", 2000))).toEqual({
      tur: "durdur",
      neden: "indirim-buyuk",
    });
    expect(yeniFiyat({ satis: 10000, indirimli: 9000 }, indirimli("azalt", 10000))).toEqual({
      tur: "durdur",
      neden: "sifira-iniyor",
    });
  });

  it("stok: eklenir, çıkarılır, çekilir; sıfırın altı ve üst sınır durdurur; takibi kapalı atlanır", () => {
    const stokIsi = (yontem: "ekle" | "cikar" | "cek", miktar: number) =>
      ({ islem: "stok", yontem, miktar, sebep: "sayim" }) as const;
    expect(yeniStok({ miktar: 3, takip: true }, stokIsi("ekle", 20))).toEqual({
      tur: "yeni",
      miktar: 23,
    });
    expect(yeniStok({ miktar: 3, takip: true }, stokIsi("cikar", 3))).toEqual({
      tur: "yeni",
      miktar: 0,
    });
    expect(yeniStok({ miktar: 3, takip: true }, stokIsi("cikar", 4))).toEqual({
      tur: "durdur",
      neden: "stok-eksi",
    });
    expect(yeniStok({ miktar: 3, takip: true }, stokIsi("cek", 0))).toEqual({
      tur: "yeni",
      miktar: 0,
    });
    expect(yeniStok({ miktar: 999_999_999, takip: true }, stokIsi("ekle", 2))).toEqual({
      tur: "durdur",
      neden: "stok-siniri",
    });
    expect(yeniStok({ miktar: 3, takip: false }, stokIsi("ekle", 1))).toEqual({
      tur: "atla",
      neden: "takip-kapali",
    });
  });

  it("ekranın yazısı sitenin biçimiyle okunur; okunamayan, sıfır, sınır dışı ve uyumsuz girdi alanın yoluyla döner", () => {
    expect(hazirla(fiyatDuzenlemesi({ deger: "12,5" }))).toMatchObject({
      degisim: { birim: "oran", deger: 1250 },
    });
    expect(hazirla(fiyatDuzenlemesi({ birim: "tutar", deger: "1.249,90" }))).toMatchObject({
      degisim: { birim: "tutar", deger: 124990 },
    });
    const alan = (girdi: TopluDuzenlemeGirdisi) => hatasi(() => hazirla(girdi));
    const beklenen = (yol: string, kod: string) => ({
      kod: "dogrulama",
      ayrinti: [{ alan: `duzenleme.${yol}`, kod }],
    });
    expect(alan(fiyatDuzenlemesi({ deger: "" }))).toEqual(beklenen("deger", "too_small"));
    expect(alan(fiyatDuzenlemesi({ deger: "on" }))).toEqual(beklenen("deger", "oran-okunamadi"));
    expect(alan(fiyatDuzenlemesi({ deger: "12,555" }))).toEqual(
      beklenen("deger", "oran-okunamadi"),
    );
    expect(alan(fiyatDuzenlemesi({ birim: "tutar", deger: "1.5" }))).toEqual(
      beklenen("deger", "tutar-okunamadi"),
    );
    expect(alan(fiyatDuzenlemesi({ deger: "0" }))).toEqual(beklenen("deger", "deger-sifir"));
    expect(hazirla(fiyatDuzenlemesi({ deger: "1000" }))).toMatchObject({
      degisim: { deger: 100_000 },
    });
    expect(hazirla(fiyatDuzenlemesi({ yontem: "azalt", deger: "100" }))).toMatchObject({
      degisim: { deger: 10_000 },
    });
    expect(alan(fiyatDuzenlemesi({ deger: "1000,01" }))).toEqual(beklenen("deger", "oran-siniri"));
    expect(alan(fiyatDuzenlemesi({ yontem: "azalt", deger: "100,01" }))).toEqual(
      beklenen("deger", "oran-siniri"),
    );
    expect(alan(fiyatDuzenlemesi({ yontem: "satistan-indir" }))).toEqual(
      beklenen("yontem", "yontem-gecersiz"),
    );
    expect(alan(fiyatDuzenlemesi({ indirimBitisi: "2026-12-01T00:00" }))).toEqual(
      beklenen("indirimBaslangici", "indirim-zamani-indirimsiz"),
    );
    expect(
      alan(
        fiyatDuzenlemesi({
          hedef: "indirimli",
          yontem: "satistan-indir",
          indirimBaslangici: "2026-12-01T00:00",
          indirimBitisi: "2026-12-01T00:00",
        }),
      ),
    ).toEqual(beklenen("indirimBitisi", "indirim-sirasi"));
    // Takvimde olmayan gün.
    expect(
      alan(
        fiyatDuzenlemesi({
          hedef: "indirimli",
          yontem: "satistan-indir",
          indirimBaslangici: "2026-13-01T00:00",
        }),
      ),
    ).toEqual(beklenen("indirimBaslangici", "indirim-zamani-gecersiz"));
    const stokDuz = (miktar: string, ek = {}) =>
      ({ islem: "stok", yontem: "ekle", miktar, sebep: "sayim", ...ek }) as TopluDuzenlemeGirdisi;
    expect(alan(stokDuz(""))).toEqual(beklenen("miktar", "too_small"));
    expect(alan(stokDuz("1,5"))).toEqual(beklenen("miktar", "miktar-okunamadi"));
    expect(alan(stokDuz("-2"))).toEqual(beklenen("miktar", "miktar-okunamadi"));
    expect(alan(stokDuz("0"))).toEqual(beklenen("miktar", "deger-sifir"));
    expect(hazirla(stokDuz("0", { yontem: "cek" }))).toMatchObject({ miktar: 0 });
    expect(alan(stokDuz("1000000001"))).toEqual(beklenen("miktar", "stok-siniri"));
    expect(alan(stokDuz("5", { sebep: "diger", not: "  " }))).toEqual(
      beklenen("not", "not-gerekli"),
    );
  });
});

let vt: Veritabani;
let sil: () => Promise<void>;
beforeAll(async () => {
  const site = await denemeSitesiAc("toplu-duzenleme");
  vt = site.vt;
  sil = site.sil;
}, 60_000);
afterAll(async () => {
  await sil();
});

const birimiOku = async (urun: string) =>
  ((await servis.urunuOku(vt, urun))?.birimler ?? []).filter((b) => !b.silindi);

// Basit ürün: fiyat (indirimli ve zamanlı olabilir) ve stok.
const basitUrun = async (
  ad: string,
  f: {
    satis?: number;
    indirimli?: number;
    baslangic?: string;
    bitis?: string;
    miktar?: number;
    takip?: boolean;
  },
) => {
  const urun = await servis.urunEkle(vt, kim, {
    ad,
    vergiSinifi: null,
    ...(f.takip === false ? { stokTakibi: false } : {}),
  });
  const birim = (await birimiOku(urun))[0]?.kimlik ?? "";
  if (f.satis !== undefined) {
    await fiyat.fiyatYaz(vt, kim, birim, {
      satisFiyati: f.satis,
      ...(f.indirimli === undefined ? {} : { indirimliFiyat: f.indirimli }),
      ...(f.baslangic === undefined ? {} : { indirimBaslangici: f.baslangic }),
      ...(f.bitis === undefined ? {} : { indirimBitisi: f.bitis }),
    });
  }
  if ((f.miktar ?? 0) > 0) {
    await stok.stokDuzelt(vt, kim, birim, {
      yeniMiktar: f.miktar ?? 0,
      gorulenMiktar: 0,
      sebep: "sayim",
    });
  }
  return { urun, birim };
};

// Renk (Kırmızı, Mavi) × Beden (S, M): dört birleşim.
const secenekliUrun = async (ad: string) => {
  const urun = await servis.urunEkle(vt, kim, { ad, vergiSinifi: null });
  await servis.varyantlariKaydet(
    vt,
    kim,
    urun,
    {
      secenekler: [
        { ad: "Renk", degerler: [{ ad: "Kırmızı" }, { ad: "Mavi" }] },
        { ad: "Beden", degerler: [{ ad: "S" }, { ad: "M" }] },
      ],
      birlesimler: [],
    },
    { silebilir: true },
  );
  return { urun, birimler: (await birimiOku(urun)).map((b) => b.kimlik) };
};

const onizle = (urunler: string[], duzenleme: TopluDuzenlemeGirdisi) =>
  topluOnizle(vt, { urunler, duzenleme }, servisler);

const onizleUygula = async (
  urunler: string[],
  duzenleme: TopluDuzenlemeGirdisi,
  araya?: () => Promise<void>,
) => {
  const onizleme = await onizle(urunler, duzenleme);
  await araya?.();
  return topluUygula(vt, kim, { urunler, duzenleme, gorulen: onizleme.gorulen }, servisler);
};

const kayitSayisi = async (kayitKimligi: string, islem: string) =>
  (
    await vt
      .select({ kim: degisiklikKayitlari.kim_kimligi })
      .from(degisiklikKayitlari)
      .where(
        and(
          eq(degisiklikKayitlari.kayit_kimligi, kayitKimligi),
          eq(degisiklikKayitlari.islem, islem),
        ),
      )
  ).filter((satir) => satir.kim === kim.kimlik).length;

describe("fiyat", () => {
  it("önizleme hiçbir şey yazmaz; birleşimler değer sırasıyla ve adlarıyla gelir", async () => {
    const { urun, birimler } = await secenekliUrun("Önizleme tişörtü");
    for (const [i, birim] of birimler.entries()) {
      await fiyat.fiyatYaz(vt, kim, birim, { satisFiyati: 10000 + i * 100 });
    }
    const onizleme = await onizle([urun], fiyatDuzenlemesi({ deger: "10" }));
    const [satir] = onizleme.urunler;
    expect(satir?.degisir).toBe(true);
    expect(satir?.birimler.map((b) => b.degerler.join(" / "))).toEqual([
      "Kırmızı / S",
      "Kırmızı / M",
      "Mavi / S",
      "Mavi / M",
    ]);
    for (const b of satir?.birimler ?? []) expect(b.yeni).toBe(Math.round((b.eski ?? 0) * 1.1));
    for (const birim of birimler) {
      expect((await fiyat.fiyatOku(vt, birim))?.satisFiyati).toBeLessThan(11000);
    }
  });

  it("satış fiyatı her birleşimde artar; indirim kalır; geçmişe ve kayda yazanıyla girer", async () => {
    const { urun, birimler } = await secenekliUrun("Artan tişört");
    for (const birim of birimler) {
      await fiyat.fiyatYaz(vt, kim, birim, {
        satisFiyati: 24990,
        indirimliFiyat: 19990,
        indirimBaslangici: "2026-12-01T00:00",
        indirimBitisi: "2026-12-31T23:59",
      });
    }
    const sonuc = await onizleUygula([urun], fiyatDuzenlemesi({ deger: "15" }));
    expect(sonuc).toEqual({ islenen: [urun], islenemeyen: [] });
    for (const birim of birimler) {
      // 249,90 × 1,15 = 287,385 → 287,39.
      expect(await fiyat.fiyatOku(vt, birim)).toMatchObject({
        satisFiyati: 28739,
        indirimliFiyat: 19990,
        indirimBaslangici: new Date("2026-11-30T21:00:00Z"),
        indirimBitisi: new Date("2026-12-31T20:59:00Z"),
      });
      const [gecmis] = await fiyat.panelFiyatGecmisi(vt, [birim]);
      expect(gecmis).toMatchObject({ satisFiyati: 28739, kim });
      expect(await kayitSayisi(birim, "fiyat.degisti")).toBe(2);
    }
  });

  it("satıştan indirim verilen zamanla yazılır; boş zamanda indirimi olan birimin zamanı kalır, yenisi süresiz", async () => {
    const eski = await basitUrun("Zamanlı mum", {
      satis: 24990,
      indirimli: 22990,
      baslangic: "2026-12-05T00:00",
      bitis: "2026-12-10T00:00",
    });
    const yeni = await basitUrun("Zamansız mum", { satis: 14990 });
    const sonuc = await onizleUygula(
      [eski.urun, yeni.urun],
      fiyatDuzenlemesi({ hedef: "indirimli", yontem: "satistan-indir", deger: "15" }),
    );
    expect(sonuc.islenemeyen).toEqual([]);
    expect(await fiyat.fiyatOku(vt, eski.birim)).toMatchObject({
      indirimliFiyat: 21242,
      indirimBaslangici: new Date("2026-12-04T21:00:00Z"),
      indirimBitisi: new Date("2026-12-09T21:00:00Z"),
    });
    expect(await fiyat.fiyatOku(vt, yeni.birim)).toMatchObject({
      indirimliFiyat: 12742,
      indirimBaslangici: null,
      indirimBitisi: null,
    });
    const zamanli = await onizleUygula(
      [eski.urun, yeni.urun],
      fiyatDuzenlemesi({
        hedef: "indirimli",
        yontem: "azalt",
        birim: "tutar",
        deger: "10",
        indirimBitisi: "2026-12-31T23:59",
      }),
    );
    expect(zamanli.islenemeyen).toEqual([]);
    // Verilen bitiş ikisine de; verilmeyen başlangıç birimin kendisinden.
    expect(await fiyat.fiyatOku(vt, eski.birim)).toMatchObject({
      indirimliFiyat: 20242,
      indirimBaslangici: new Date("2026-12-04T21:00:00Z"),
      indirimBitisi: new Date("2026-12-31T20:59:00Z"),
    });
    expect(await fiyat.fiyatOku(vt, yeni.birim)).toMatchObject({
      indirimliFiyat: 11742,
      indirimBaslangici: null,
      indirimBitisi: new Date("2026-12-31T20:59:00Z"),
    });
  });

  it("indirimi olmayan birleşim atlanır; hiçbir birimi işlenemeyen ürün nedeniyle döner", async () => {
    const { urun, birimler } = await secenekliUrun("Yarım indirim");
    const [a, b, c, d] = birimler;
    for (const birim of [a, b, c, d]) {
      await fiyat.fiyatYaz(vt, kim, birim ?? "", {
        satisFiyati: 10000,
        ...(birim === a ? { indirimliFiyat: 9000 } : {}),
      });
    }
    const fiyatsiz = await basitUrun("Fiyatsız", {});
    const indirimsiz = await basitUrun("İndirimsiz", { satis: 5000 });
    const onizleme = await onizle(
      [urun, fiyatsiz.urun, indirimsiz.urun],
      fiyatDuzenlemesi({ hedef: "indirimli", yontem: "azalt", deger: "10" }),
    );
    expect(onizleme.urunler.map((u) => [u.degisir, u.neden])).toEqual([
      [true, undefined],
      [false, "fiyat-yok"],
      [false, "indirim-yok"],
    ]);
    expect(onizleme.urunler[0]?.birimler.map((x) => x.neden)).toEqual([
      undefined,
      "indirim-yok",
      "indirim-yok",
      "indirim-yok",
    ]);
    expect(Object.keys(onizleme.gorulen)).toEqual([urun]);
    const sonuc = await topluUygula(
      vt,
      kim,
      {
        urunler: [urun, fiyatsiz.urun, indirimsiz.urun],
        duzenleme: fiyatDuzenlemesi({ hedef: "indirimli", yontem: "azalt", deger: "10" }),
        gorulen: onizleme.gorulen,
      },
      servisler,
    );
    expect(sonuc).toEqual({
      islenen: [urun],
      islenemeyen: [
        { anahtar: fiyatsiz.urun, kod: "fiyat-yok" },
        { anahtar: indirimsiz.urun, kod: "indirim-yok" },
      ],
    });
    expect((await fiyat.fiyatOku(vt, a ?? ""))?.indirimliFiyat).toBe(8100);
    expect((await fiyat.fiyatOku(vt, b ?? ""))?.indirimliFiyat).toBe(null);
  });

  it("kurala aykırı birleşimi olan ürünün hiçbir birimi değişmez; öteki ürünler işlenir", async () => {
    const { urun, birimler } = await secenekliUrun("Kuralsız");
    for (const [i, birim] of birimler.entries()) {
      // Yalnız son birleşimin indirimli fiyatı satışa yakın: onda biri azalınca indirimli fiyatın altına iner.
      await fiyat.fiyatYaz(vt, kim, birim, {
        satisFiyati: 10000,
        indirimliFiyat: i === 3 ? 9500 : 5000,
      });
    }
    const iyi = await basitUrun("Kurallı", { satis: 10000 });
    const sifir = await basitUrun("Sıfıra inen", { satis: 500 });
    const sonuc = await onizleUygula(
      [urun, iyi.urun, sifir.urun],
      fiyatDuzenlemesi({ yontem: "azalt", birim: "tutar", deger: "10" }),
    );
    expect(sonuc).toEqual({
      islenen: [iyi.urun],
      islenemeyen: [
        { anahtar: urun, kod: "indirim-buyuk" },
        { anahtar: sifir.urun, kod: "sifira-iniyor" },
      ],
    });
    for (const birim of birimler)
      expect((await fiyat.fiyatOku(vt, birim))?.satisFiyati).toBe(10000);
    expect((await fiyat.fiyatOku(vt, sifir.birim))?.satisFiyati).toBe(500);
    expect((await fiyat.fiyatOku(vt, iyi.birim))?.satisFiyati).toBe(9000);
  });

  it("önizlemeden sonra fiyatı değişen ürün işlenmez, öteki işlenir; silinmiş ürün bulunamadı", async () => {
    const degisen = await basitUrun("Değişen", { satis: 10000 });
    const kalan = await basitUrun("Kalan", { satis: 10000 });
    const silinen = await basitUrun("Silinen", { satis: 10000 });
    const sonuc = await onizleUygula(
      [degisen.urun, kalan.urun, silinen.urun],
      fiyatDuzenlemesi({}),
      async () => {
        await fiyat.fiyatYaz(vt, kim, degisen.birim, { satisFiyati: 12000 });
        await servis.urunSil(vt, kim, silinen.urun);
      },
    );
    expect(sonuc).toEqual({
      islenen: [kalan.urun],
      islenemeyen: [
        { anahtar: degisen.urun, kod: "degisti" },
        { anahtar: silinen.urun, kod: "bulunamadi" },
      ],
    });
    expect((await fiyat.fiyatOku(vt, degisen.birim))?.satisFiyati).toBe(12000);
  });

  it("önizlemeden sonra birleşim eklenen ürün işlenmez", async () => {
    const { urun, birimler } = await secenekliUrun("Büyüyen");
    for (const birim of birimler) await fiyat.fiyatYaz(vt, kim, birim, { satisFiyati: 10000 });
    const sonuc = await onizleUygula([urun], fiyatDuzenlemesi({}), async () => {
      await servis.varyantlariKaydet(
        vt,
        kim,
        urun,
        {
          secenekler: [
            { ad: "Renk", degerler: [{ ad: "Kırmızı" }, { ad: "Mavi" }, { ad: "Yeşil" }] },
            { ad: "Beden", degerler: [{ ad: "S" }, { ad: "M" }] },
          ],
          birlesimler: [],
        },
        { silebilir: true },
      );
    });
    expect(sonuc.islenemeyen).toEqual([{ anahtar: urun, kod: "degisti" }]);
    for (const birim of birimler)
      expect((await fiyat.fiyatOku(vt, birim))?.satisFiyati).toBe(10000);
  });
});

describe("indirimin zamanı (bağımsız kontrolün bulguları)", () => {
  it("bitişi geçmiş indirim yok sayılır: zamanı yeni indirime taşınmaz, satış fiyatı azalınca silinir", async () => {
    const bitmis = await basitUrun("Bitmiş indirim", {
      satis: 24990,
      indirimli: 19990,
      baslangic: "2026-01-01T00:00",
      bitis: "2026-01-31T00:00",
    });
    const onizleme = await onizle(
      [bitmis.urun],
      fiyatDuzenlemesi({ hedef: "indirimli", yontem: "satistan-indir", deger: "20" }),
    );
    // Eski indirimli fiyat "yok" görünür (bitmiş).
    expect(onizleme.urunler[0]?.birimler[0]).toMatchObject({ eski: null, yeni: 19992 });
    await topluUygula(
      vt,
      kim,
      {
        urunler: [bitmis.urun],
        duzenleme: fiyatDuzenlemesi({ hedef: "indirimli", yontem: "satistan-indir", deger: "20" }),
        gorulen: onizleme.gorulen,
      },
      servisler,
    );
    expect(await fiyat.fiyatOku(vt, bitmis.birim)).toMatchObject({
      indirimliFiyat: 19992,
      indirimBaslangici: null,
      indirimBitisi: null,
    });
    // Satış fiyatı bitmiş indirimli fiyatın altına inse de işlenir, bitmiş indirim kalkar.
    const ikinci = await basitUrun("Bitmiş indirim 2", {
      satis: 24990,
      indirimli: 19990,
      bitis: "2026-01-31T00:00",
    });
    expect(
      await onizleUygula([ikinci.urun], fiyatDuzenlemesi({ yontem: "azalt", deger: "50" })),
    ).toEqual({ islenen: [ikinci.urun], islenemeyen: [] });
    expect(await fiyat.fiyatOku(vt, ikinci.birim)).toMatchObject({
      satisFiyati: 12495,
      indirimliFiyat: null,
      indirimBitisi: null,
    });
  });

  it("tek zaman verilince kayıtlı zamanla sırası önizlemede denetlenir", async () => {
    const urun = await basitUrun("Sıralı", {
      satis: 10000,
      indirimli: 9000,
      baslangic: "2026-12-01T00:00",
      bitis: "2026-12-10T00:00",
    });
    const onizleme = await onizle(
      [urun.urun],
      fiyatDuzenlemesi({
        hedef: "indirimli",
        yontem: "azalt",
        deger: "5",
        indirimBaslangici: "2026-12-15T00:00",
      }),
    );
    expect(onizleme.urunler[0]).toMatchObject({ degisir: false, neden: "indirim-sirasi" });
  });

  it("yalnız zamanı değişen ürün de değişir ve yazılır", async () => {
    // 100,00'ün %15 indirimi 85,00: aynı oranla yalnız bitiş değişir.
    const urun = await basitUrun("Yalnız zaman", { satis: 10000, indirimli: 8500 });
    const duzenleme = fiyatDuzenlemesi({
      hedef: "indirimli",
      yontem: "satistan-indir",
      deger: "15",
      indirimBitisi: "2026-12-31T23:59",
    });
    const onizleme = await onizle([urun.urun], duzenleme);
    expect(onizleme.urunler[0]).toMatchObject({ degisir: true });
    expect(onizleme.urunler[0]?.birimler[0]).toMatchObject({
      eski: 8500,
      yeni: 8500,
      degisir: true,
    });
    await topluUygula(
      vt,
      kim,
      { urunler: [urun.urun], duzenleme, gorulen: onizleme.gorulen },
      servisler,
    );
    expect(await fiyat.fiyatOku(vt, urun.birim)).toMatchObject({
      indirimliFiyat: 8500,
      indirimBitisi: new Date("2026-12-31T20:59:00Z"),
    });
  });
});

describe("önizlemenin kuralları (bağımsız kontrolün bulguları)", () => {
  it("stok notu stok servisinin kuralıyla alanın hatasıdır", async () => {
    const urun = await basitUrun("Notlu", { miktar: 1 });
    const stokNotu = (not: string) =>
      sozHatasi(
        onizle([urun.urun], { islem: "stok", yontem: "ekle", miktar: "1", sebep: "sayim", not }),
      );
    expect(await stokNotu("a".repeat(501))).toEqual({
      kod: "dogrulama",
      ayrinti: [{ alan: "duzenleme.not", kod: "not-uzun" }],
    });
    expect(await stokNotu("depo@ornek.test")).toEqual({
      kod: "dogrulama",
      ayrinti: [{ alan: "duzenleme.not", kod: "kayda-uygun-degil" }],
    });
  });

  it("eklenince kategori sınırını aşan ürün önizlemede nedeniyle işlenmez", async () => {
    const kategoriler: string[] = [];
    for (let i = 0; i < 51; i += 1) {
      kategoriler.push(
        await kategoriEkle(vt, kim, { ad: `Sınır ${i} ${randomUUID().slice(0, 6)}` }),
      );
    }
    const dolu = await servis.urunEkle(vt, kim, {
      ad: "Dolu",
      vergiSinifi: null,
      kategoriler: kategoriler.slice(0, 50),
    });
    const bos = await servis.urunEkle(vt, kim, { ad: "Boş", vergiSinifi: null });
    const onizleme = await onizle([dolu, bos], {
      islem: "kategori-ekle",
      kategoriler: [kategoriler[50] ?? ""],
    });
    expect(onizleme.urunler.map((u) => [u.degisir, u.neden])).toEqual([
      [false, "kategori-siniri"],
      [true, undefined],
    ]);
  });
});

describe("stok", () => {
  it("her birleşime eklenir, sebep ve notla geçmişe yazanıyla girer; takibi kapalı ürün işlenmez", async () => {
    const { urun, birimler } = await secenekliUrun("Stoklu tişört");
    const takipsiz = await basitUrun("Takipsiz", { satis: 100, takip: false });
    const sonuc = await onizleUygula([urun, takipsiz.urun], {
      islem: "stok",
      yontem: "ekle",
      miktar: "20",
      sebep: "yeni-mal",
      not: "Kasım sevkiyatı",
    });
    expect(sonuc).toEqual({
      islenen: [urun],
      islenemeyen: [{ anahtar: takipsiz.urun, kod: "takip-kapali" }],
    });
    for (const birim of birimler) {
      const [gecmis] = await stok.stokGecmisiniOku(vt, birim);
      expect(gecmis).toMatchObject({
        oncekiMiktar: 0,
        sonrakiMiktar: 20,
        sebep: "yeni-mal",
        not: "Kasım sevkiyatı",
        kim,
      });
      expect(await kayitSayisi(birim, "stok.duzeltildi")).toBe(1);
    }
  });

  it("çıkarma sıfırın altına inen birimde ürünü durdurur; çekme verilen miktara getirir", async () => {
    const az = await basitUrun("Az", { miktar: 2 });
    const cok = await basitUrun("Çok", { miktar: 9 });
    const cikar = await onizleUygula([az.urun, cok.urun], {
      islem: "stok",
      yontem: "cikar",
      miktar: "3",
      sebep: "hasarli-kayip",
    });
    expect(cikar).toEqual({
      islenen: [cok.urun],
      islenemeyen: [{ anahtar: az.urun, kod: "stok-eksi" }],
    });
    const cek = await onizleUygula([az.urun, cok.urun], {
      islem: "stok",
      yontem: "cek",
      miktar: "0",
      sebep: "sayim",
    });
    expect(cek.islenemeyen).toEqual([]);
    const miktarlar = await stok.stoklariOku(vt, [az.birim, cok.birim]);
    expect([miktarlar.get(az.birim)?.miktar, miktarlar.get(cok.birim)?.miktar]).toEqual([0, 0]);
  });

  it("önizlemeden sonra stoğu değişen ürün işlenmez", async () => {
    const urun = await basitUrun("Satılan", { miktar: 5 });
    const sonuc = await onizleUygula(
      [urun.urun],
      { islem: "stok", yontem: "ekle", miktar: "1", sebep: "sayim" },
      async () => {
        await stok.stokDuzelt(vt, kim, urun.birim, {
          yeniMiktar: 4,
          gorulenMiktar: 5,
          sebep: "sayim",
        });
      },
    );
    expect(sonuc.islenemeyen).toEqual([{ anahtar: urun.urun, kod: "degisti" }]);
    expect((await stok.stoklariOku(vt, [urun.birim])).get(urun.birim)?.miktar).toBe(4);
  });
});

describe("kategori", () => {
  it("eklenir ve çıkarılır, öteki kategoriler kalır; zaten bağlı ürün değişmez; kayda girer", async () => {
    const [a, b, c] = [
      await kategoriEkle(vt, kim, { ad: `A ${randomUUID().slice(0, 6)}` }),
      await kategoriEkle(vt, kim, { ad: `B ${randomUUID().slice(0, 6)}` }),
      await kategoriEkle(vt, kim, { ad: `C ${randomUUID().slice(0, 6)}` }),
    ];
    const bir = await servis.urunEkle(vt, kim, { ad: "Bir", vergiSinifi: null, kategoriler: [a] });
    const iki = await servis.urunEkle(vt, kim, {
      ad: "İki",
      vergiSinifi: null,
      kategoriler: [a, b],
    });
    const onizleme = await onizle([bir, iki], { islem: "kategori-ekle", kategoriler: [b, c] });
    expect(onizleme.urunler.map((u) => u.degisir)).toEqual([true, true]);
    expect(
      await topluUygula(
        vt,
        kim,
        { urunler: [bir, iki], duzenleme: { islem: "kategori-ekle", kategoriler: [b, c] } },
        servisler,
      ),
    ).toEqual({ islenen: [bir, iki], islenemeyen: [] });
    expect((await servis.urunuOku(vt, bir))?.kategoriler).toEqual([a, b, c].toSorted());
    expect((await servis.urunuOku(vt, iki))?.kategoriler).toEqual([a, b, c].toSorted());
    const zaten = await onizle([bir], { islem: "kategori-ekle", kategoriler: [c] });
    expect(zaten.urunler[0]?.degisir).toBe(false);
    await topluUygula(
      vt,
      kim,
      { urunler: [bir, iki], duzenleme: { islem: "kategori-cikar", kategoriler: [a, c] } },
      servisler,
    );
    expect((await servis.urunuOku(vt, bir))?.kategoriler).toEqual([b]);
    expect(await kayitSayisi(bir, "urun.degisti")).toBe(2);
  });

  it("silinmiş kategori önizlemede alanın hatası, önizlemeden sonra silinende ürün işlenmez", async () => {
    const silinmis = await kategoriEkle(vt, kim, { ad: `S ${randomUUID().slice(0, 6)}` });
    await kategoriSil(vt, kim, silinmis);
    const urun = await servis.urunEkle(vt, kim, { ad: "Kategorisiz", vergiSinifi: null });
    expect(
      await sozHatasi(onizle([urun], { islem: "kategori-ekle", kategoriler: [silinmis] })),
    ).toEqual({
      kod: "dogrulama",
      ayrinti: [{ alan: "duzenleme.kategoriler", kod: "kategori-gecersiz" }],
    });
    const sonra = await kategoriEkle(vt, kim, { ad: `T ${randomUUID().slice(0, 6)}` });
    await onizle([urun], { islem: "kategori-ekle", kategoriler: [sonra] });
    await kategoriSil(vt, kim, sonra);
    expect(
      await topluUygula(
        vt,
        kim,
        { urunler: [urun], duzenleme: { islem: "kategori-ekle", kategoriler: [sonra] } },
        servisler,
      ),
    ).toEqual({ islenen: [], islenemeyen: [{ anahtar: urun, kod: "kategori-gecersiz" }] });
    expect((await servis.urunuOku(vt, urun))?.kategoriler).toEqual([]);
  });
});

describe("iki site", () => {
  it("başka sitenin ürünü bulunamaz, fiyatı değişmez", async () => {
    const oteki = await denemeSitesiAc("toplu-duzenleme-oteki");
    try {
      const urun = await servis.urunEkle(oteki.vt, kim, { ad: "Öteki", vergiSinifi: null });
      const birim = (await servis.urunuOku(oteki.vt, urun))?.birimler[0]?.kimlik ?? "";
      await fiyat.fiyatYaz(oteki.vt, kim, birim, { satisFiyati: 10000 });
      const sonuc = await topluUygula(
        vt,
        kim,
        {
          urunler: [urun],
          duzenleme: fiyatDuzenlemesi({}),
          gorulen: { [urun]: { [birim]: { satis: 10000, indirimli: null } } },
        },
        servisler,
      );
      expect(sonuc.islenemeyen).toEqual([{ anahtar: urun, kod: "bulunamadi" }]);
      expect((await fiyat.fiyatOku(oteki.vt, birim))?.satisFiyati).toBe(10000);
    } finally {
      await oteki.sil();
    }
  });
});
