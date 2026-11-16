// Stok durumu ve stok ayarları (kart 0083, karar 0069): takibi kapalı ürünün hep satılabilir olması,
// tükenmiş birim, ürün eşiği olan ve olmayan üründe düşük stok, "son X ürün" eşiği, tükenen ürün
// ayarının iki değerinde listeler, ürün sayfası ve ilgili ürünler; listedeki tükenmişlik kuralının
// stokDurumu ile aynı sonucu vermesi; ayarların varsayılanı ve sitenin kendi ayarıyla okunması.
// Kart 0085: ürünün genel durumu birimlerinden (tek ve çok birimli, silinmiş birleşim, birimsiz ürün) ve
// çok birimli üründe listedeki tükenmişlik kuralıyla aynı sonuç.
// Kart 0155 (karar 0133): fiyatı olmayan birim satılamaz; test ürünleri sitenin para biriminde fiyatla kurulur,
// fiyatsız birim ayrıca denenir. Ürünler arası karşılaştırma cekirdek/testler/fiyatsiz-birim.test.ts'tedir.
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { eq, inArray, sql } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { magazaAyarSemasi } from "../../../ayar-semasi/ayarlar.ts";
import { siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import type { TukenenUrunDavranisi } from "../../../kayitlar/stok.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { fiyatServisi } from "../../fiyat/servis.ts";
import { kategoriEkle, kategorininUrunleri } from "../../kategori/servis.ts";
import { siteninServisi } from "../../magaza-ayarlari/servis.ts";
import { ilgiliUrunleriGetir } from "../../urun/ilgili.ts";
import { urunBirimleri, urunler as urunTablosu } from "../../urun/model.ts";
import { urunServisi } from "../../urun/servis.ts";
import {
  type StokDurumAyarlari,
  siteninStokDurumlari,
  stokDurumlari,
  stokDurumu,
  tukenmisUrunKosulu,
  urunStokDurumlari,
  urunStokDurumu,
} from "../durum.ts";
import { stokServisi } from "../servis.ts";

const stok = stokServisi();
const urunSrv = urunServisi(() => "Europe/Istanbul");
// Deneme sitelerinin para birimi (ayar-semasi/testler/ornek-siteler/gecerli): fiyatı olan birim satılabilir.
const paraBirimi = "XTS";
const fiyat = fiyatServisi(() => ({ saatDilimi: "Europe/Istanbul", paraBirimi }));
const ayarlar: StokDurumAyarlari = { dusukStokEsigi: 5, sonAdetEsigi: 5, paraBirimi };

const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

const silinecekler: (() => Promise<void>)[] = [];
const siteAc = async (): Promise<Veritabani> => {
  const site = await denemeSitesiAc("stokdurum");
  silinecekler.push(site.sil);
  return site.vt;
};
afterEach(async () => {
  await Promise.all(silinecekler.splice(0).map((sil) => sil()));
});

// Yayındaki ürün, tek birimi, fiyatı (fiyatsiz verilmezse) ve stoğu.
const urunAc = async (
  vt: Veritabani,
  miktar: number,
  ek: {
    takip?: boolean;
    esik?: number;
    kategori?: string;
    ilgili?: string[];
    fiyatsiz?: boolean;
  } = {},
) => {
  const urun = await urunSrv.urunEkle(vt, yonetici(), {
    ad: `Ürün ${randomUUID().slice(0, 8)}`,
    vergiSinifi: null,
    durum: "yayinda",
    ...(ek.takip === undefined ? {} : { stokTakibi: ek.takip }),
    ...(ek.esik === undefined ? {} : { dusukStokEsigi: ek.esik }),
    ...(ek.kategori === undefined ? {} : { kategoriler: [ek.kategori] }),
    ...(ek.ilgili === undefined ? {} : { ilgiliUrunler: ek.ilgili }),
  });
  const birim = (await urunSrv.urunuOku(vt, urun))?.birimler[0]?.kimlik;
  if (birim === undefined) throw new Error("Birim yok.");
  if (ek.fiyatsiz !== true) await fiyat.fiyatYaz(vt, yonetici(), birim, { satisFiyati: 10_000 });
  if (miktar > 0) {
    await stok.stokDuzelt(vt, yonetici(), birim, {
      yeniMiktar: miktar,
      gorulenMiktar: 0,
      sebep: "yeni-mal",
    });
  }
  return { urun, birim };
};

const secenek = (tukenenUrun: TukenenUrunDavranisi) =>
  tukenenUrun === "gizle"
    ? { tukenenUrun: "gizle" as const, paraBirimi }
    : { tukenenUrun: "goster" as const };

describe("stok durumu", () => {
  const durum = (
    miktar: number,
    ek: { takip?: boolean; esik?: number | null; silinmis?: boolean; fiyatli?: boolean } = {},
  ) =>
    stokDurumu(
      {
        miktar,
        takip: ek.takip ?? true,
        dusukStokEsigi: ek.esik ?? null,
        silinmis: ek.silinmis ?? false,
        fiyatli: ek.fiyatli ?? true,
      },
      ayarlar,
    );

  it("takibi kapalı ürün her zaman satılabilir, tükenmez, düşük stokta olmaz", () => {
    for (const miktar of [0, 1, 100]) {
      expect(durum(miktar, { takip: false })).toEqual({
        takip: false,
        miktar,
        satilabilir: true,
        tukendi: false,
        dusukStok: false,
        gosterim: { tur: "stokta" },
      });
    }
  });

  it("silinmiş birim, stoğu ya da takibi ne olursa olsun satılamaz (kart 0083 kontrolü)", () => {
    for (const ek of [{ takip: false }, { takip: true }]) {
      for (const miktar of [0, 9]) {
        expect(durum(miktar, { ...ek, silinmis: true })).toMatchObject({
          satilabilir: false,
          tukendi: true,
          dusukStok: false,
          gosterim: { tur: "tukendi" },
        });
      }
    }
  });

  it("fiyatı olmayan birim, stoğu ya da takibi ne olursa olsun satılamaz (kart 0155)", () => {
    for (const ek of [{ takip: false }, { takip: true }]) {
      for (const miktar of [0, 9]) {
        expect(durum(miktar, { ...ek, fiyatli: false })).toMatchObject({
          satilabilir: false,
          tukendi: true,
          dusukStok: false,
          gosterim: { tur: "tukendi" },
        });
      }
    }
  });

  it("stok sıfırsa tükenmiştir ve satılamaz", () => {
    expect(durum(0)).toEqual({
      takip: true,
      miktar: 0,
      satilabilir: false,
      tukendi: true,
      dusukStok: false,
      gosterim: { tur: "tukendi" },
    });
  });

  it("ürün eşiği olmayan üründe düşük stok genel ayardan: eşik dahil", () => {
    expect([1, 4, 5, 6].map((m) => durum(m).dusukStok)).toEqual([true, true, true, false]);
  });

  it("ürün eşiği varsa o geçerlidir; 0 eşik düşük stoğu kapatır", () => {
    expect([2, 3, 4, 10].map((m) => durum(m, { esik: 3 }).dusukStok)).toEqual([
      true,
      true,
      false,
      false,
    ]);
    expect([1, 5].map((m) => durum(m, { esik: 20 }).dusukStok)).toEqual([true, true]);
    expect(durum(1, { esik: 0 }).dusukStok).toBe(false);
    expect(
      stokDurumu(
        { miktar: 1, takip: true, dusukStokEsigi: null, silinmis: false, fiyatli: true },
        { ...ayarlar, dusukStokEsigi: 0 },
      ).dusukStok,
    ).toBe(false);
  });

  it("son X ürün eşiği dahildir; 0 kalan adeti yazdırmaz; ürün eşiğinden bağımsızdır", () => {
    expect(durum(5).gosterim).toEqual({ tur: "son-adet", adet: 5 });
    expect(durum(1).gosterim).toEqual({ tur: "son-adet", adet: 1 });
    expect(durum(6).gosterim).toEqual({ tur: "stokta" });
    expect(durum(3, { esik: 1 }).gosterim).toEqual({ tur: "son-adet", adet: 3 });
    expect(
      stokDurumu(
        { miktar: 1, takip: true, dusukStokEsigi: null, silinmis: false, fiyatli: true },
        { ...ayarlar, sonAdetEsigi: 0 },
      ).gosterim,
    ).toEqual({ tur: "stokta" });
  });

  it("ayarların varsayılanları site ayarları taslağıyla aynı", () => {
    const varsayilan = magazaAyarSemasi.parse({});
    expect({
      tukenenUrun: varsayilan.tukenenUrun,
      dusukStokEsigi: varsayilan.dusukStokEsigi,
      sonAdetEsigi: varsayilan.sonAdetEsigi,
    }).toEqual({ tukenenUrun: "goster", dusukStokEsigi: 5, sonAdetEsigi: 5 });
    for (const bozuk of [{ tukenenUrun: "sakla" }, { dusukStokEsigi: -1 }, { sonAdetEsigi: 1.5 }]) {
      expect(magazaAyarSemasi.safeParse(bozuk).success).toBe(false);
    }
  });
});

describe("veritabanıyla stok durumu", () => {
  it("birimlerin durumu tek sorguyla, ürünün eşiğiyle gelir", async () => {
    const vt = await siteAc();
    const a = await urunAc(vt, 0);
    const b = await urunAc(vt, 3);
    const c = await urunAc(vt, 3, { esik: 2 });
    const d = await urunAc(vt, 0, { takip: false });
    const e = await urunAc(vt, 3, { fiyatsiz: true });
    const sorgu = vi.spyOn(vt.$client, "query");
    const sonuc = await stokDurumlari(
      vt,
      [a, b, c, d, e].map((x) => x.birim).concat("bozuk"),
      ayarlar,
    );
    expect(sorgu).toHaveBeenCalledTimes(1);
    sorgu.mockRestore();
    expect([a, b, c, d, e].map((x) => sonuc.get(x.birim))).toMatchObject([
      { tukendi: true, satilabilir: false, dusukStok: false },
      {
        tukendi: false,
        satilabilir: true,
        dusukStok: true,
        gosterim: { tur: "son-adet", adet: 3 },
      },
      { tukendi: false, dusukStok: false },
      { tukendi: false, satilabilir: true, takip: false },
      { tukendi: true, satilabilir: false, dusukStok: false, gosterim: { tur: "tukendi" } },
    ]);
    expect(sonuc.size).toBe(5);
    // Başka para birimiyle okununca fiyat yok sayılır: birim satılamaz.
    const baskaBirimde = await stokDurumlari(vt, [b.birim], { ...ayarlar, paraBirimi: "XXX" });
    expect(baskaBirimde.get(b.birim)).toMatchObject({ satilabilir: false, tukendi: true });
  });

  it("sitenin kendi ayarıyla okunur, ayar değişince sonuç değişir", async () => {
    const deneme = await denemeSitesiAc("stokdurum");
    silinecekler.push(deneme.sil);
    const site = siteKlasorunuOku(
      join(
        import.meta.dirname,
        "..",
        "..",
        "..",
        "ayar-semasi",
        "testler",
        "ornek-siteler",
        "gecerli",
      ),
    );
    const { birim } = await urunAc(deneme.vt, 4);
    const ilk = (await siteninStokDurumlari(deneme.vt, site, [birim])).get(birim);
    expect(ilk).toMatchObject({ dusukStok: true, gosterim: { tur: "son-adet", adet: 4 } });
    await siteninServisi(site).degistir(deneme.vt, yonetici(), {
      dusukStokEsigi: 3,
      sonAdetEsigi: 2,
    });
    const sonra = (await siteninStokDurumlari(deneme.vt, site, [birim])).get(birim);
    expect(sonra).toMatchObject({ dusukStok: false, gosterim: { tur: "stokta" } });
  });

  it("ürünün eşiği yazılır, değişir, kaldırılır; eksi eşik reddedilir", async () => {
    const vt = await siteAc();
    const { urun } = await urunAc(vt, 1, { esik: 7 });
    expect((await urunSrv.urunuOku(vt, urun))?.dusukStokEsigi).toBe(7);
    await urunSrv.urunDegistir(vt, yonetici(), urun, { dusukStokEsigi: null });
    expect((await urunSrv.urunuOku(vt, urun))?.dusukStokEsigi).toBeUndefined();
    const hata = await urunSrv.urunDegistir(vt, yonetici(), urun, { dusukStokEsigi: -1 }).then(
      () => undefined,
      (yakalanan: unknown) => yakalanan,
    );
    expect(hata).toBeInstanceOf(BilinenHata);
    await expect(
      vt.update(urunTablosu).set({ dusuk_stok_esigi: -1 }).where(eq(urunTablosu.kimlik, urun)),
    ).rejects.toThrow();
  });

  it("listedeki tükenmişlik kuralı stokDurumu ile aynı sonucu verir", async () => {
    const vt = await siteAc();
    const urunler = await Promise.all([
      urunAc(vt, 0),
      urunAc(vt, 1),
      urunAc(vt, 0, { takip: false }),
      urunAc(vt, 9, { takip: false }),
    ]);
    // Stoğu satılıp biten ürün.
    const satilan = await urunAc(vt, 1);
    await vt.transaction((islem) =>
      stok.stokDus(islem, yonetici(), [{ birim: satilan.birim, adet: 1 }], { sebep: "siparis" }),
    );
    // Birimi tek başına silinmiş ürünler (stoklu ve takipsiz) ve silinmiş ürün (kart 0083 kontrolü).
    const birimiSilinen = await urunAc(vt, 4);
    const takipsizBirimiSilinen = await urunAc(vt, 0, { takip: false });
    for (const { birim } of [birimiSilinen, takipsizBirimiSilinen]) {
      await vt
        .update(urunBirimleri)
        .set({ silinme_zamani: new Date() })
        .where(eq(urunBirimleri.kimlik, birim));
    }
    const silinen = await urunAc(vt, 3);
    await urunSrv.urunSil(vt, yonetici(), silinen.urun);
    // Fiyatsız ürünler: stoklu ve takipsiz (kart 0155).
    const fiyatsiz = await urunAc(vt, 4, { fiyatsiz: true });
    const takipsizFiyatsiz = await urunAc(vt, 0, { takip: false, fiyatsiz: true });
    // Yalnız ürünü silinmiş, birimi silinmemiş (servis ikisini birlikte siler; doğrudan yazıyla kurulur).
    const yalnizUrunuSilinen = await urunAc(vt, 3, { takip: false });
    await vt
      .update(urunTablosu)
      .set({ silinme_zamani: new Date() })
      .where(eq(urunTablosu.kimlik, yalnizUrunuSilinen.urun));
    const hepsi = [
      ...urunler,
      satilan,
      birimiSilinen,
      takipsizBirimiSilinen,
      silinen,
      yalnizUrunuSilinen,
      fiyatsiz,
      takipsizFiyatsiz,
    ];
    const tukenmis = await vt
      .select({ kimlik: urunTablosu.kimlik })
      .from(urunTablosu)
      .where(
        sql`${inArray(
          urunTablosu.kimlik,
          hepsi.map((u) => u.urun),
        )} and ${tukenmisUrunKosulu(paraBirimi)}`,
      );
    const durumlar = await stokDurumlari(
      vt,
      hepsi.map((u) => u.birim),
      ayarlar,
    );
    // Yalnız ürünü silinmiş olan karşılaştırmaya girmez: liste kuralı ürünün silinmişliğine bakmaz, onu
    // vitrin koşulu süzer (silinmiş ürün listeye hiç girmez). Birimi ise satılamaz (aşağıda).
    expect(tukenmis.map((t) => t.kimlik).toSorted()).toEqual(
      hepsi
        .filter((u) => u !== yalnizUrunuSilinen && durumlar.get(u.birim)?.tukendi)
        .map((u) => u.urun)
        .toSorted(),
    );
    expect(tukenmis).toHaveLength(7);
    for (const u of [
      birimiSilinen,
      takipsizBirimiSilinen,
      silinen,
      yalnizUrunuSilinen,
      fiyatsiz,
      takipsizFiyatsiz,
    ]) {
      expect(durumlar.get(u.birim)).toMatchObject({ satilabilir: false, tukendi: true });
    }
  });

  it("yalnız silinmiş biriminde stok kalan ürün listede tükenmiştir", async () => {
    const vt = await siteAc();
    const { urun, birim } = await urunAc(vt, 4);
    const gizlide = () => urunSrv.vitrindeGorunurMu(vt, urun, "liste", secenek("gizle"));
    expect(await gizlide()).toBe(true);
    await vt
      .update(urunBirimleri)
      .set({ silinme_zamani: new Date() })
      .where(eq(urunBirimleri.kimlik, birim));
    expect(await gizlide()).toBe(false);
  });
});

describe("tükenen ürün ayarı vitrinde", () => {
  it("göster: tükenmiş ürün listede ve sayfada görünür; gizle: listede yok, sayfası açılır", async () => {
    const vt = await siteAc();
    const tukenmis = await urunAc(vt, 0);
    const stokta = await urunAc(vt, 2);
    const takipsiz = await urunAc(vt, 0, { takip: false });
    const gorunur = (u: { urun: string }, yer: "liste" | "sayfa", t: TukenenUrunDavranisi) =>
      urunSrv.vitrindeGorunurMu(vt, u.urun, yer, secenek(t));
    expect(await gorunur(tukenmis, "liste", "goster")).toBe(true);
    expect(await gorunur(tukenmis, "sayfa", "goster")).toBe(true);
    expect(await gorunur(tukenmis, "liste", "gizle")).toBe(false);
    expect(await gorunur(tukenmis, "sayfa", "gizle")).toBe(true);
    for (const u of [stokta, takipsiz]) {
      expect(await gorunur(u, "liste", "gizle")).toBe(true);
    }
    // Stok gelince listeye kendiliğinden döner, bitince yeniden çıkar.
    await stok.stokDuzelt(vt, yonetici(), tukenmis.birim, {
      yeniMiktar: 1,
      gorulenMiktar: 0,
      sebep: "yeni-mal",
    });
    expect(await gorunur(tukenmis, "liste", "gizle")).toBe(true);
    await vt.transaction((islem) =>
      stok.stokDus(islem, yonetici(), [{ birim: tukenmis.birim, adet: 1 }], { sebep: "siparis" }),
    );
    expect(await gorunur(tukenmis, "liste", "gizle")).toBe(false);
  });

  it("kategori listesi gizlede tükenmiş ürünü getirmez, sayıyı da ona göre verir", async () => {
    const vt = await siteAc();
    const kategori = await kategoriEkle(vt, yonetici(), { ad: "Mumlar" });
    const tukenmis = await urunAc(vt, 0, { kategori });
    const stokta = await urunAc(vt, 1, { kategori });
    expect(
      await kategorininUrunleri(vt, kategori, {
        vitrin: { yer: "liste", ...secenek("gizle") },
      }),
    ).toEqual({ urunler: [stokta.urun], toplam: 1 });
    expect(
      (
        await kategorininUrunleri(vt, kategori, {
          vitrin: { yer: "liste", ...secenek("goster") },
        })
      ).urunler.toSorted(),
    ).toEqual([tukenmis.urun, stokta.urun].toSorted());
  });

  it("ilgili ürünler gizlenen tükenmiş ürünü getirmez: elle seçimde de kategoriden de", async () => {
    const vt = await siteAc();
    const kategori = await kategoriEkle(vt, yonetici(), { ad: "Kupalar" });
    const tukenmis = await urunAc(vt, 0, { kategori });
    const stokta = await urunAc(vt, 1, { kategori });
    const elle = await urunAc(vt, 1, { ilgili: [tukenmis.urun, stokta.urun] });
    expect(await ilgiliUrunleriGetir(vt, elle.urun, secenek("gizle"))).toEqual([stokta.urun]);
    expect(await ilgiliUrunleriGetir(vt, elle.urun, secenek("goster"))).toEqual([
      tukenmis.urun,
      stokta.urun,
    ]);
    // Elle seçimin hepsi tükenmişse liste kategoriden gelir; orada da tükenmiş yoktur.
    const yalniz = await urunAc(vt, 1, { kategori, ilgili: [tukenmis.urun] });
    expect(await ilgiliUrunleriGetir(vt, yalniz.urun, secenek("gizle"))).toEqual([stokta.urun]);
    expect(await ilgiliUrunleriGetir(vt, yalniz.urun, secenek("goster"))).toEqual([tukenmis.urun]);
    // Tükenmiş ürünün kendi sayfası gizlede de açılır, onun ilgili ürünleri gelir.
    expect(await ilgiliUrunleriGetir(vt, tukenmis.urun, secenek("gizle"))).toEqual([
      yalniz.urun,
      stokta.urun,
    ]);
  });
});

describe("ürünün genel durumu (kart 0085)", () => {
  const birim = (miktar: number, takip = true) =>
    stokDurumu({ miktar, takip, dusukStokEsigi: null, silinmis: false, fiyatli: true }, ayarlar);

  it("tek birimli üründe birimin durumudur, kalan adet dahil", () => {
    expect(urunStokDurumu([birim(3)])).toEqual({
      satilabilir: true,
      tukendi: false,
      gosterim: { tur: "son-adet", adet: 3 },
    });
    expect(urunStokDurumu([birim(0)])).toEqual({
      satilabilir: false,
      tukendi: true,
      gosterim: { tur: "tukendi" },
    });
  });

  it("çok birimli üründe biri satılabilirse stokta, kalan adet yazılmaz; hiçbiri değilse tükendi", () => {
    expect(urunStokDurumu([birim(0), birim(2)])).toEqual({
      satilabilir: true,
      tukendi: false,
      gosterim: { tur: "stokta" },
    });
    expect(urunStokDurumu([birim(0), birim(0), birim(0)])).toEqual({
      satilabilir: false,
      tukendi: true,
      gosterim: { tur: "tukendi" },
    });
    expect(urunStokDurumu([])).toEqual({
      satilabilir: false,
      tukendi: true,
      gosterim: { tur: "tukendi" },
    });
  });

  it("veritabanıyla: birleşimlerden çıkar, silinmiş birleşim sayılmaz, liste kuralıyla aynı", async () => {
    const vt = await siteAc();
    // Beden S, M, L tek seçenek: her değer bir birleşim.
    const varyantli = async (miktarlar: number[], takip = true) => {
      const urun = await urunSrv.urunEkle(vt, yonetici(), {
        ad: `Varyantlı ${randomUUID().slice(0, 8)}`,
        vergiSinifi: null,
        durum: "yayinda",
        stokTakibi: takip,
      });
      const adlar = miktarlar.map((_, i) => `d${i}`);
      await urunSrv.secenekEkle(vt, yonetici(), urun, { ad: "Beden", degerler: adlar });
      const degerler = (await urunSrv.urunuOku(vt, urun))?.secenekler[0]?.degerler ?? [];
      const birimler: string[] = [];
      for (const [i, miktar] of miktarlar.entries()) {
        const kimlik = await urunSrv.birlesimEkle(vt, yonetici(), urun, {
          degerler: [degerler[i]?.kimlik ?? ""],
        });
        await fiyat.fiyatYaz(vt, yonetici(), kimlik, { satisFiyati: 10_000 });
        if (miktar > 0) {
          await stok.stokDuzelt(vt, yonetici(), kimlik, {
            yeniMiktar: miktar,
            gorulenMiktar: 0,
            sebep: "sayim",
          });
        }
        birimler.push(kimlik);
      }
      return { urun, birimler };
    };
    const birStokta = await varyantli([0, 4, 0]);
    const hepsiTukenmis = await varyantli([0, 0]);
    const takipsiz = await varyantli([0, 0], false);
    // Stoklu tek birleşimi silinen ürün tükenmiştir.
    const stokluSilinen = await varyantli([0, 6]);
    await urunSrv.birlesimSil(vt, yonetici(), stokluSilinen.birimler[1] ?? "");
    // Bütün birleşimleri silinen (birimsiz) ürün tükenmiştir.
    const birimsiz = await varyantli([5]);
    await urunSrv.birlesimSil(vt, yonetici(), birimsiz.birimler[0] ?? "");
    // Silinmiş birleşim sayılmaz: tek canlı birleşimi kalan ürün onun kalan adedini yazar.
    const tekKalan = await varyantli([3, 9]);
    await urunSrv.birlesimSil(vt, yonetici(), tekKalan.birimler[1] ?? "");
    const basit = await urunAc(vt, 2);
    const hepsi = [birStokta, hepsiTukenmis, takipsiz, stokluSilinen, birimsiz, tekKalan];
    const kimlikler = [...hepsi.map((u) => u.urun), basit.urun];
    const durumlar = await urunStokDurumlari(vt, [...kimlikler, randomUUID(), "bozuk"], ayarlar);
    expect(kimlikler.map((k) => durumlar.get(k)?.gosterim)).toEqual([
      { tur: "stokta" },
      { tur: "tukendi" },
      { tur: "stokta" },
      { tur: "tukendi" },
      { tur: "tukendi" },
      { tur: "son-adet", adet: 3 },
      { tur: "son-adet", adet: 2 },
    ]);
    expect(durumlar.size).toBe(kimlikler.length);
    const tukenmis = await vt
      .select({ kimlik: urunTablosu.kimlik })
      .from(urunTablosu)
      .where(sql`${inArray(urunTablosu.kimlik, kimlikler)} and ${tukenmisUrunKosulu(paraBirimi)}`);
    expect(tukenmis.map((t) => t.kimlik).toSorted()).toEqual(
      kimlikler.filter((k) => durumlar.get(k)?.tukendi).toSorted(),
    );
  });

  it("ürün sayısıyla sorgu sayısı artmaz", async () => {
    const vt = await siteAc();
    const urunler = await Promise.all([1, 2, 3, 4].map((m) => urunAc(vt, m)));
    const sorgular = vi.spyOn(vt.$client, "query");
    await urunStokDurumlari(vt, urunler.map((u) => u.urun).slice(0, 1), ayarlar);
    const bir = sorgular.mock.calls.length;
    sorgular.mockClear();
    await urunStokDurumlari(
      vt,
      urunler.map((u) => u.urun),
      ayarlar,
    );
    expect(sorgular.mock.calls.length).toBe(bir);
    sorgular.mockRestore();
  });
});
