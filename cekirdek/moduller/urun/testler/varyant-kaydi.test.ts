// Panelin seçenekler bölümünün servisi gerçek veritabanıyla (kart 0264, karar 0163): varyantlariKaydet seçeneklerin,
// değerlerin ve birleşim alanlarının son hâlini tek işlemde yazar. Basit üründen seçenekli ürün kurulur, basit birim
// ilk birleşim olur ve fiyatı, stoğu, stok kodu kalır; birleşimler bütün değerlerin birleşimidir, eksik olan açılır;
// yeni değer ve yeni seçenek var olan birleşimleri korur; değer ve seçenek silme birleşimlerini siler ve silebilir ister;
// bütün değerlerin değişmesi, son seçeneğin silinmesi, ad ve sıra; hata girdideki yerin yoluyla döner ve hiçbir şey
// yazılmaz; aynı girdi ikinci kez kayda girmez.
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { BilinenHata } from "../../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import { varyantSinirlari } from "../../../kayitlar/urun.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { fiyatServisi } from "../../fiyat/servis.ts";
import { stokServisi } from "../../stok/servis.ts";
import type { VaryantKaydi } from "../semalar.ts";
import { urunServisi } from "../servis.ts";

const servis = urunServisi(() => "Europe/Istanbul");
const fiyat = fiyatServisi(() => ({ saatDilimi: "Europe/Istanbul", paraBirimi: "XTS" }));
const stok = stokServisi();
const kim: DegisikligiYapan = { tur: "yonetici", kimlik: randomUUID() };
const silebilir = { silebilir: true };

const silinecekler: (() => Promise<void>)[] = [];
const siteAc = async (): Promise<Veritabani> => {
  const site = await denemeSitesiAc("varyant-kaydi");
  silinecekler.push(site.sil);
  return site.vt;
};
afterEach(async () => {
  await Promise.all(silinecekler.splice(0).map((sil) => sil()));
});

const hatasi = async (is: Promise<unknown>) => {
  const hata = await is.then(
    () => undefined,
    (yakalanan: unknown) => yakalanan,
  );
  if (!(hata instanceof BilinenHata)) throw new Error(`Bilinen hata beklenirdi: ${String(hata)}`);
  return { kod: hata.kod, ayrinti: hata.ayrinti };
};

// Ürünün seçenekleri adlarıyla ve canlı birleşimleri değer adlarıyla, sırasıyla.
const durum = async (vt: Veritabani, urun: string) => {
  const okunan = await servis.urunuOku(vt, urun);
  const ad = new Map(
    (okunan?.secenekler ?? []).flatMap((s) => s.degerler.map((d) => [d.kimlik, d.ad])),
  );
  return {
    tur: okunan?.tur,
    secenekler: (okunan?.secenekler ?? [])
      .filter((s) => !s.silindi)
      .map((s) => ({
        kimlik: s.kimlik,
        ad: s.ad,
        degerler: s.degerler.filter((d) => !d.silindi).map((d) => ({ kimlik: d.kimlik, ad: d.ad })),
      })),
    birimler: (okunan?.birimler ?? [])
      .filter((b) => !b.silindi)
      .map((b) => ({
        kimlik: b.kimlik,
        ad: b.degerler.map((d) => ad.get(d)).join("/"),
        stokKodu: b.stokKodu,
        barkod: b.barkod,
        agirlikGram: b.agirlikGram,
      })),
    silinmis: (okunan?.birimler ?? []).filter((b) => b.silindi).map((b) => b.kimlik),
  };
};

const kayitSayisi = async (vt: Veritabani) =>
  (await vt.select({ kimlik: degisiklikKayitlari.kimlik }).from(degisiklikKayitlari)).length;

// Beden (S, M) ve Renk (Gri, Lacivert): yeni seçenekler, birleşimlerin stok kodu yerleriyle.
const ikiSecenek: VaryantKaydi = {
  secenekler: [
    { ad: "Beden", degerler: [{ ad: "S" }, { ad: "M" }] },
    { ad: "Renk", degerler: [{ ad: "Gri" }, { ad: "Lacivert" }] },
  ],
  birlesimler: [
    { degerler: [0, 0], stokKodu: "SW-S-GRI", agirlikGram: 400 },
    { degerler: [0, 1], stokKodu: "SW-S-LCV" },
    { degerler: [1, 0], stokKodu: "SW-M-GRI", barkod: "96385074" },
    { degerler: [1, 1], stokKodu: "SW-M-LCV" },
  ],
};

// Kaydedilmiş ürünün girdisi: var olanlar kimlikleriyle.
const kimlikli = (d: Awaited<ReturnType<typeof durum>>): VaryantKaydi["secenekler"] =>
  d.secenekler.map((s) => ({
    kimlik: s.kimlik,
    ad: s.ad,
    degerler: s.degerler.map((x) => ({ kimlik: x.kimlik, ad: x.ad })),
  }));

const basitUrun = async (vt: Veritabani) => {
  const urun = await servis.urunEkle(vt, kim, {
    ad: "Sweatshirt",
    vergiSinifi: null,
    stokKodu: "SW-BASIT",
  });
  const birim = (await servis.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
  await fiyat.fiyatYaz(vt, kim, birim, { satisFiyati: 64990 });
  await stok.stokDuzelt(vt, kim, birim, { yeniMiktar: 6, gorulenMiktar: 0, sebep: "sayim" });
  return { urun, birim };
};

describe("seçenekli ürünü kurmak", () => {
  it("basit ürün iki seçenekle kurulur: basit birim ilk birleşim olur, öteki üçü açılır, alanlar yazılır", async () => {
    const vt = await siteAc();
    const { urun, birim } = await basitUrun(vt);
    await servis.varyantlariKaydet(vt, kim, urun, ikiSecenek, silebilir);
    const d = await durum(vt, urun);
    expect(d.tur).toBe("varyantli");
    expect(d.secenekler.map((s) => [s.ad, s.degerler.map((x) => x.ad)])).toEqual([
      ["Beden", ["S", "M"]],
      ["Renk", ["Gri", "Lacivert"]],
    ]);
    expect(d.birimler).toEqual([
      { kimlik: birim, ad: "S/Gri", stokKodu: "SW-S-GRI", agirlikGram: 400 },
      expect.objectContaining({ ad: "S/Lacivert", stokKodu: "SW-S-LCV" }),
      expect.objectContaining({ ad: "M/Gri", stokKodu: "SW-M-GRI", barkod: "96385074" }),
      expect.objectContaining({ ad: "M/Lacivert", stokKodu: "SW-M-LCV" }),
    ]);
    expect(d.silinmis).toEqual([]);
    // Fiyat ve stok ilk birleşimde kaldı; yeni birleşimler fiyatsız ve stoksuz.
    expect((await fiyat.fiyatOku(vt, birim))?.satisFiyati).toBe(64990);
    expect((await stok.stoklariOku(vt, [birim])).get(birim)?.miktar).toBe(6);
    const yeni = d.birimler[1]?.kimlik ?? "";
    expect(await fiyat.fiyatOku(vt, yeni)).toBeUndefined();
  });

  it("verilmeyen birleşimin alanı boş açılır; aynı girdi ikinci kez hiçbir şey yazmaz", async () => {
    const vt = await siteAc();
    const { urun } = await basitUrun(vt);
    await servis.varyantlariKaydet(
      vt,
      kim,
      urun,
      { secenekler: ikiSecenek.secenekler, birlesimler: [] },
      silebilir,
    );
    const d = await durum(vt, urun);
    expect(d.birimler.map((b) => [b.ad, b.stokKodu])).toEqual([
      // Basit birimin stok kodu ilk birleşimde kalır.
      ["S/Gri", "SW-BASIT"],
      ["S/Lacivert", undefined],
      ["M/Gri", undefined],
      ["M/Lacivert", undefined],
    ]);
    const once = await kayitSayisi(vt);
    await servis.varyantlariKaydet(
      vt,
      kim,
      urun,
      { secenekler: kimlikli(d), birlesimler: [] },
      silebilir,
    );
    expect(await kayitSayisi(vt)).toBe(once);
    expect(await durum(vt, urun)).toEqual(d);
  });
});

describe("değer ve seçenek eklemek", () => {
  it("yeni değer var olan birleşimleri korur, yalnız kendi birleşimlerini açar", async () => {
    const vt = await siteAc();
    const { urun } = await basitUrun(vt);
    await servis.varyantlariKaydet(vt, kim, urun, ikiSecenek, silebilir);
    const once = await durum(vt, urun);
    const secenekler = kimlikli(once);
    secenekler[0]?.degerler.push({ ad: "L" });
    await servis.varyantlariKaydet(
      vt,
      kim,
      urun,
      { secenekler, birlesimler: [{ degerler: [2, 1], stokKodu: "SW-L-LCV" }] },
      silebilir,
    );
    const sonra = await durum(vt, urun);
    expect(sonra.birimler.map((b) => b.ad)).toEqual([
      "S/Gri",
      "S/Lacivert",
      "M/Gri",
      "M/Lacivert",
      "L/Gri",
      "L/Lacivert",
    ]);
    // Eski birleşimler aynı birim, alanları değişmedi (girdide verilmeyen alan dokunulmaz).
    expect(sonra.birimler.slice(0, 4)).toEqual(once.birimler);
    expect(sonra.birimler[5]?.stokKodu).toBe("SW-L-LCV");
    expect(sonra.silinmis).toEqual([]);
  });

  it("yeni seçenek eklenince her birleşim ilk değerini alır, öteki değerlerin birleşimleri açılır", async () => {
    const vt = await siteAc();
    const { urun, birim } = await basitUrun(vt);
    await servis.varyantlariKaydet(vt, kim, urun, ikiSecenek, silebilir);
    const once = await durum(vt, urun);
    await servis.varyantlariKaydet(
      vt,
      kim,
      urun,
      {
        secenekler: [
          ...kimlikli(once),
          { ad: "Kumaş", degerler: [{ ad: "Pamuk" }, { ad: "Polar" }] },
        ],
        birlesimler: [],
      },
      silebilir,
    );
    const sonra = await durum(vt, urun);
    expect(sonra.birimler.map((b) => b.ad)).toEqual([
      "S/Gri/Pamuk",
      "S/Gri/Polar",
      "S/Lacivert/Pamuk",
      "S/Lacivert/Polar",
      "M/Gri/Pamuk",
      "M/Gri/Polar",
      "M/Lacivert/Pamuk",
      "M/Lacivert/Polar",
    ]);
    // Pamuk birleşimleri eski birimlerdir: stok kodu ve stok kaldı.
    expect(sonra.birimler.filter((b) => b.ad.endsWith("Pamuk")).map((b) => b.kimlik)).toEqual(
      once.birimler.map((b) => b.kimlik),
    );
    expect(sonra.birimler[0]).toMatchObject({ kimlik: birim, stokKodu: "SW-S-GRI" });
    expect((await stok.stoklariOku(vt, [birim])).get(birim)?.miktar).toBe(6);
    expect(sonra.silinmis).toEqual([]);
  });
});

describe("silmek", () => {
  it("çıkan değerin birleşimleri silinir, ötekiler kalır; silebilir değilse yetki ve hiçbir şey değişmez", async () => {
    const vt = await siteAc();
    const { urun } = await basitUrun(vt);
    await servis.varyantlariKaydet(vt, kim, urun, ikiSecenek, silebilir);
    const once = await durum(vt, urun);
    const secenekler = kimlikli(once);
    secenekler[1]?.degerler.splice(1, 1);
    const girdi = { secenekler, birlesimler: [] };
    const kayitlar = await kayitSayisi(vt);
    expect(
      await hatasi(servis.varyantlariKaydet(vt, kim, urun, girdi, { silebilir: false })),
    ).toEqual({ kod: "yetki", ayrinti: [{ alan: "secenekler", kod: "varyant-silme-yetkisi" }] });
    expect(await durum(vt, urun)).toEqual(once);
    expect(await kayitSayisi(vt)).toBe(kayitlar);
    await servis.varyantlariKaydet(vt, kim, urun, girdi, silebilir);
    const sonra = await durum(vt, urun);
    expect(sonra.birimler.map((b) => b.ad)).toEqual(["S/Gri", "M/Gri"]);
    expect(sonra.silinmis).toHaveLength(2);
  });

  it("bir seçenek silinince birleşimleri silinir, kalan seçeneğin birleşimleri açılır; son seçenekle ürün basit olur", async () => {
    const vt = await siteAc();
    const { urun } = await basitUrun(vt);
    await servis.varyantlariKaydet(vt, kim, urun, ikiSecenek, silebilir);
    const once = await durum(vt, urun);
    await servis.varyantlariKaydet(
      vt,
      kim,
      urun,
      { secenekler: kimlikli(once).slice(0, 1), birlesimler: [{ degerler: [1], stokKodu: "M" }] },
      silebilir,
    );
    const tek = await durum(vt, urun);
    expect(tek.birimler.map((b) => [b.ad, b.stokKodu])).toEqual([
      ["S", undefined],
      ["M", "M"],
    ]);
    expect(tek.silinmis).toHaveLength(4);
    await servis.varyantlariKaydet(vt, kim, urun, { secenekler: [], birlesimler: [] }, silebilir);
    const basit = await durum(vt, urun);
    expect(basit.tur).toBe("basit");
    expect(basit.birimler).toHaveLength(1);
  });

  it("bir seçeneğin bütün değerleri değişince eskiler silinir, yeniler açılır (son değer kuralına takılmaz)", async () => {
    const vt = await siteAc();
    const { urun } = await basitUrun(vt);
    await servis.varyantlariKaydet(vt, kim, urun, ikiSecenek, silebilir);
    const secenekler = kimlikli(await durum(vt, urun));
    const renk = secenekler[1];
    if (renk === undefined) throw new Error("Renk yok.");
    renk.degerler = [{ ad: "Siyah" }];
    await servis.varyantlariKaydet(vt, kim, urun, { secenekler, birlesimler: [] }, silebilir);
    expect((await durum(vt, urun)).birimler.map((b) => b.ad)).toEqual(["S/Siyah", "M/Siyah"]);
  });
});

describe("ad, sıra ve hatalar", () => {
  it("seçeneklerin ve değerlerin adı ve sırası girdideki yerdir; birleşimler o sırayla gelir", async () => {
    const vt = await siteAc();
    const { urun } = await basitUrun(vt);
    await servis.varyantlariKaydet(vt, kim, urun, ikiSecenek, silebilir);
    const [beden, renk] = kimlikli(await durum(vt, urun));
    if (beden === undefined || renk === undefined) throw new Error("Seçenek yok.");
    await servis.varyantlariKaydet(
      vt,
      kim,
      urun,
      {
        secenekler: [
          { ...renk, ad: "Renk seçimi", degerler: renk.degerler.toReversed() },
          { ...beden, degerler: beden.degerler.map((d) => ({ ...d, ad: `${d.ad}-beden` })) },
        ],
        birlesimler: [],
      },
      silebilir,
    );
    const d = await durum(vt, urun);
    expect(d.secenekler.map((s) => [s.ad, s.degerler.map((x) => x.ad)])).toEqual([
      ["Renk seçimi", ["Lacivert", "Gri"]],
      ["Beden", ["S-beden", "M-beden"]],
    ]);
    expect(d.birimler.map((b) => b.ad)).toEqual([
      "Lacivert/S-beden",
      "Lacivert/M-beden",
      "Gri/S-beden",
      "Gri/M-beden",
    ]);
  });

  it("hata girdideki yerin yoluyla döner ve hiçbir şey yazılmaz", async () => {
    const vt = await siteAc();
    const { urun } = await basitUrun(vt);
    const baska = await servis.urunEkle(vt, kim, {
      ad: "Başka",
      vergiSinifi: null,
      stokKodu: "BASKA-1",
    });
    await servis.varyantlariKaydet(vt, kim, urun, ikiSecenek, silebilir);
    const once = await durum(vt, urun);
    const kayitlar = await kayitSayisi(vt);
    const secenekler = kimlikli(once);
    const dene = async (girdi: VaryantKaydi) => {
      const sonuc = await hatasi(servis.varyantlariKaydet(vt, kim, urun, girdi, silebilir));
      expect(await durum(vt, urun)).toEqual(once);
      expect(await kayitSayisi(vt)).toBe(kayitlar);
      return sonuc;
    };
    // Başka ürünün stok kodu, yeni değerin birleşiminde: birleşimin yeri ve alanı.
    secenekler[0]?.degerler.push({ ad: "L" });
    expect(
      await dene({ secenekler, birlesimler: [{ degerler: [2, 0], stokKodu: "baska-1" }] }),
    ).toEqual({
      kod: "cakisma",
      ayrinti: [{ alan: "birlesimler.0.stokKodu", kod: "stok-kodu-tekrar" }],
    });
    // Aynı seçenekte aynı değer iki kez (harf farkıyla): değerin yeri.
    const tekrar = kimlikli(once);
    tekrar[1]?.degerler.push({ ad: "gri" });
    expect(await dene({ secenekler: tekrar, birlesimler: [] })).toEqual({
      kod: "cakisma",
      ayrinti: [{ alan: "secenekler.1.degerler.2.ad", kod: "deger-ad-tekrar" }],
    });
    // Başka ürünün değeri ya da olmayan seçenek: ekran eski.
    const yabanci = kimlikli(once);
    const baskaSecenek = await servis.secenekEkle(vt, kim, baska, { ad: "X", degerler: ["x"] });
    const yabanciKayitlar = await kayitSayisi(vt);
    if (yabanci[0] !== undefined) yabanci[0].kimlik = baskaSecenek;
    expect(
      await hatasi(
        servis.varyantlariKaydet(
          vt,
          kim,
          urun,
          { secenekler: yabanci, birlesimler: [] },
          silebilir,
        ),
      ),
    ).toEqual({ kod: "cakisma", ayrinti: [{ alan: "secenekler.0", kod: "varyant-degisti" }] });
    expect(await durum(vt, urun)).toEqual(once);
    expect(await kayitSayisi(vt)).toBe(yabanciKayitlar);
    // Birleşimin yeri seçeneklerle uyuşmuyor.
    expect(
      await hatasi(
        servis.varyantlariKaydet(
          vt,
          kim,
          urun,
          { secenekler: kimlikli(once), birlesimler: [{ degerler: [0, 5] }] },
          silebilir,
        ),
      ),
    ).toEqual({
      kod: "dogrulama",
      ayrinti: [{ alan: "birlesimler.0.degerler", kod: "birlesim-gecersiz" }],
    });
    // Aynı birleşim girdide iki kez: ikincisinin yeri.
    expect(
      await hatasi(
        servis.varyantlariKaydet(
          vt,
          kim,
          urun,
          {
            secenekler: kimlikli(once),
            birlesimler: [
              { degerler: [1, 1], stokKodu: "A" },
              { degerler: [1, 1], stokKodu: "B" },
            ],
          },
          silebilir,
        ),
      ),
    ).toEqual({
      kod: "dogrulama",
      ayrinti: [{ alan: "birlesimler.1.degerler", kod: "birlesim-gecersiz" }],
    });
    // Galeride olmayan görsel: birleşimin görsel alanı.
    expect(
      await hatasi(
        servis.varyantlariKaydet(
          vt,
          kim,
          urun,
          { secenekler: kimlikli(once), birlesimler: [{ degerler: [1, 1], gorsel: randomUUID() }] },
          silebilir,
        ),
      ),
    ).toEqual({
      kod: "dogrulama",
      ayrinti: [{ alan: "birlesimler.0.gorsel", kod: "birim-gorseli-gecersiz" }],
    });
    expect(await durum(vt, urun)).toEqual(once);
  });

  it("birleşim sınırı aşılırsa hiçbir şey yazılmaz", async () => {
    const vt = await siteAc();
    const { urun } = await basitUrun(vt);
    const degerler = (onEk: string, sayi: number) =>
      Array.from({ length: sayi }, (_, i) => ({ ad: `${onEk}${i}` }));
    expect(
      await hatasi(
        servis.varyantlariKaydet(
          vt,
          kim,
          urun,
          {
            secenekler: [
              { ad: "A", degerler: degerler("a", 11) },
              { ad: "B", degerler: degerler("b", 10) },
            ],
            birlesimler: [],
          },
          silebilir,
        ),
      ),
    ).toEqual({ kod: "is-kurali", ayrinti: [{ alan: "secenekler", kod: "birlesim-siniri" }] });
    expect((await durum(vt, urun)).tur).toBe("basit");
    expect(varyantSinirlari.birlesim).toBe(100);
  });

  it("değişiklik kaydı: dönüşen birim değerleriyle, yeni birleşim ve seçenek kendi satırlarıyla", async () => {
    const vt = await siteAc();
    const { urun, birim } = await basitUrun(vt);
    await servis.varyantlariKaydet(vt, kim, urun, ikiSecenek, silebilir);
    const birimKayitlari = await vt
      .select({ islem: degisiklikKayitlari.islem })
      .from(degisiklikKayitlari)
      .where(eq(degisiklikKayitlari.kayit_kimligi, birim));
    expect(birimKayitlari.map((k) => k.islem)).toEqual(
      expect.arrayContaining(["urun-birimi.degisti"]),
    );
    const hepsi = await vt.select({ islem: degisiklikKayitlari.islem }).from(degisiklikKayitlari);
    const say = (islem: string) => hepsi.filter((k) => k.islem === islem).length;
    expect(say("urun-secenegi.eklendi")).toBe(2);
    expect(say("urun-birimi.eklendi")).toBe(3);
  });
});
