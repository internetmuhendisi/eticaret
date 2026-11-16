// Fiyatsız birim her yerde satılamaz (kart 0155, karar 0133): stoğu olsa da, takibi kapalı olsa da fiyatı
// olmayan birim satılabilir sayılmaz. Gerçek veritabanıyla aynı ürünler her yerde aynı sonucu verir:
// birimin durumu (stokDurumlari), ürünün genel durumu (urunStokDurumlari), ürün kartı (urunKartlari),
// "tükeneni gizle" ayarıyla liste (vitrinKosulu, filtreliUrunListesi), "yalnız stoktakiler" filtresi, ilgili
// ürünler (ilgiliUrunleriGetir) ve ürün sayfası (urunSayfasiVerisi).
//
// Ürünler:
// - varyantli: A birleşimi stoklu ama fiyatsız, B birleşimi fiyatlı ama tükenmiş: satılabilir birimi yok.
// - fiyatsiz: basit ürün, stoklu ama fiyatsız.
// - takipsiz: basit ürün, stok takibi kapalı, fiyatsız.
// - yabanci: basit ürün, stoklu, fiyatı sitenin para biriminden başka birimde yazılmış (fiyat yok sayılır).
// - satilir: basit ürün, fiyatlı ve stoklu (karşılaştırma).
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { type Site, siteKlasorunuOku } from "../ayar-semasi/site-klasoru.ts";
import type { DegisikligiYapan } from "../kayitlar/degisiklik-islemleri.ts";
import type { TukenenUrunDavranisi } from "../kayitlar/stok.ts";
import { birimFiyatlari } from "../moduller/fiyat/model.ts";
import { siteninFiyatServisi } from "../moduller/fiyat/servis.ts";
import { kategoriEkle, kategoriUrunKosulu } from "../moduller/kategori/servis.ts";
import { siteninMagazaAyarlari } from "../moduller/magaza-ayarlari/servis.ts";
import { siteninStokDurumlari, siteninUrunStokDurumlari } from "../moduller/stok/durum.ts";
import { stokServisi } from "../moduller/stok/servis.ts";
import { bosFiltre } from "../moduller/urun/filtre.ts";
import { ilgiliUrunleriGetir } from "../moduller/urun/ilgili.ts";
import { urunServisi } from "../moduller/urun/servis.ts";
import { vitrinStokSecenegi } from "../moduller/urun/vitrin.ts";
import { baglantiyiKapat, type Veritabani } from "../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../veritabani/testler/deneme-sitesi.ts";
import { urunKartlari } from "../vitrin/urun-karti/veri.ts";
import { filtreliUrunListesi } from "../vitrin/urun-listesi/veri.ts";
import { urunSayfasiVerisi } from "../vitrin/urun-sayfasi/veri.ts";

const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

const site: Site = siteKlasorunuOku(
  resolve(import.meta.dirname, "../ayar-semasi/testler/ornek-siteler/vergi-dolu"),
);
const urunler = urunServisi(() => site.ayarlar.saatDilimi);
const fiyat = siteninFiyatServisi(site);
const stok = stokServisi();

const temizlenecekler: (() => Promise<void>)[] = [];
afterEach(async () => {
  await baglantiyiKapat();
  for (const temizle of temizlenecekler.splice(0)) await temizle();
});

const hazirla = async () => {
  const deneme = await denemeSitesiAc("fiyatsiz-birim");
  temizlenecekler.push(deneme.sil);
  const vt = deneme.vt;
  const kategori = await kategoriEkle(vt, yonetici(), {
    ad: `Kategori ${randomUUID().slice(0, 8)}`,
  });
  const stokYaz = (birim: string, yeniMiktar: number) =>
    stok.stokDuzelt(vt, yonetici(), birim, { yeniMiktar, gorulenMiktar: 0, sebep: "sayim" });
  const urunAc = (ek: object = {}, kategoriler = [kategori]) =>
    urunler.urunEkle(vt, yonetici(), {
      ad: `Ürün ${randomUUID().slice(0, 8)}`,
      vergiSinifi: null,
      durum: "yayinda",
      kategoriler,
      ...ek,
    });
  const ilkBirim = async (urun: string) =>
    (await urunler.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";

  const varyantli = await urunAc();
  await urunler.secenekEkle(vt, yonetici(), varyantli, { ad: "Beden", degerler: ["S", "M"] });
  const okunan = await urunler.urunuOku(vt, varyantli);
  const [s, m] = okunan?.secenekler[0]?.degerler.map((d) => d.kimlik) ?? [];
  if (s === undefined || m === undefined) throw new Error("Değer yok.");
  const a = await urunler.birlesimEkle(vt, yonetici(), varyantli, {
    degerler: [s],
    stokKodu: `A-${randomUUID().slice(0, 6)}`,
  });
  const b = await urunler.birlesimEkle(vt, yonetici(), varyantli, {
    degerler: [m],
    stokKodu: `B-${randomUUID().slice(0, 6)}`,
  });
  await stokYaz(a, 5);
  await fiyat.fiyatYaz(vt, yonetici(), b, { satisFiyati: 10_000 });

  const fiyatsiz = await urunAc();
  const fiyatsizBirim = await ilkBirim(fiyatsiz);
  await stokYaz(fiyatsizBirim, 5);

  const takipsiz = await urunAc({ stokTakibi: false });
  const takipsizBirim = await ilkBirim(takipsiz);

  const yabanci = await urunAc();
  const yabanciBirim = await ilkBirim(yabanci);
  await stokYaz(yabanciBirim, 5);
  await fiyat.fiyatYaz(vt, yonetici(), yabanciBirim, { satisFiyati: 10_000 });
  // Fiyat servisi yalnız sitenin para birimiyle yazar; başka birimdeki satır doğrudan yazılarak kurulur.
  await vt
    .update(birimFiyatlari)
    .set({ para_birimi: site.ayarlar.paraBirimi === "EUR" ? "USD" : "EUR" })
    .where(eq(birimFiyatlari.birim_kimligi, yabanciBirim));

  const satilir = await urunAc();
  const satilirBirim = await ilkBirim(satilir);
  await stokYaz(satilirBirim, 20);
  await fiyat.fiyatYaz(vt, yonetici(), satilirBirim, { satisFiyati: 10_000 });

  // İlgili ürünleri elle seçilmiş ürün, kategorisiz (listede görünmez). Elle seçim en çok dört üründür
  // (karar 0065): fiyatsız basit ürün öteki testlerde denenir.
  const bakilan = await urunAc({ ilgiliUrunler: [varyantli, takipsiz, yabanci, satilir] }, []);

  return {
    vt,
    kategori,
    bakilan,
    urun: { varyantli, fiyatsiz, takipsiz, yabanci, satilir },
    birim: {
      a,
      b,
      fiyatsiz: fiyatsizBirim,
      takipsiz: takipsizBirim,
      yabanci: yabanciBirim,
      satilir: satilirBirim,
    },
  };
};

const listele = async (
  vt: Veritabani,
  kategori: string,
  tukenenUrun: TukenenUrunDavranisi,
  stoktakiler = false,
) => {
  const liste = await filtreliUrunListesi(vt, site, {
    kapsam: kategoriUrunKosulu(kategori, false),
    filtre: { ...bosFiltre(), stoktakiler },
    siralama: "en-yeni",
    sayfa: 1,
    boyut: 24,
    tukenenUrun,
    an: new Date(),
  });
  return new Set(liste.urunler);
};

describe("fiyatsız birim satılamaz", () => {
  it("birimin durumu: fiyatsız, takipsiz fiyatsız ve başka para birimindeki birim tükenmiş, fiyatlı stoklu satılabilir", async () => {
    const h = await hazirla();
    const durumlar = await siteninStokDurumlari(h.vt, site, Object.values(h.birim));
    const ozet = Object.fromEntries(
      Object.entries(h.birim).map(([ad, birim]) => {
        const d = durumlar.get(birim);
        return [
          ad,
          { satilabilir: d?.satilabilir, tukendi: d?.tukendi, gosterim: d?.gosterim.tur },
        ];
      }),
    );
    const tukenmis = { satilabilir: false, tukendi: true, gosterim: "tukendi" };
    expect(ozet).toEqual({
      a: tukenmis,
      b: tukenmis,
      fiyatsiz: tukenmis,
      takipsiz: tukenmis,
      yabanci: tukenmis,
      satilir: { satilabilir: true, tukendi: false, gosterim: "stokta" },
    });
  });

  it("ürünün genel durumu ve kartı: yalnız fiyatlı stoklu ürün tükenmemiş", async () => {
    const h = await hazirla();
    const kimlikler = Object.values(h.urun);
    const genel = await siteninUrunStokDurumlari(h.vt, site, kimlikler);
    const kartlar = await urunKartlari(h.vt, site, kimlikler, { yer: "liste" });
    const beklenen = {
      varyantli: true,
      fiyatsiz: true,
      takipsiz: true,
      yabanci: true,
      satilir: false,
    };
    expect(
      Object.fromEntries(Object.entries(h.urun).map(([ad, k]) => [ad, genel.get(k)?.tukendi])),
    ).toEqual(beklenen);
    expect(
      Object.fromEntries(
        Object.entries(h.urun).map(([ad, k]) => [
          ad,
          kartlar.find((kart) => kart.kimlik === k)?.tukendi,
        ]),
      ),
    ).toEqual(beklenen);
  });

  it("liste: 'gizle' ayarında yalnız satılabilir ürün, 'göster'de hepsi; 'yalnız stoktakiler' yalnız satılabilir", async () => {
    const h = await hazirla();
    const hepsi = new Set(Object.values(h.urun));
    expect(await listele(h.vt, h.kategori, "goster")).toEqual(hepsi);
    expect(await listele(h.vt, h.kategori, "gizle")).toEqual(new Set([h.urun.satilir]));
    expect(await listele(h.vt, h.kategori, "goster", true)).toEqual(new Set([h.urun.satilir]));
  });

  it("ilgili ürünler: 'gizle' ayarında yalnız satılabilir ürün gelir", async () => {
    const h = await hazirla();
    const ayarlar = await siteninMagazaAyarlari(h.vt, site);
    const goster = await ilgiliUrunleriGetir(
      h.vt,
      h.bakilan,
      vitrinStokSecenegi(site, { ...ayarlar, tukenenUrun: "goster" }),
    );
    const gizle = await ilgiliUrunleriGetir(
      h.vt,
      h.bakilan,
      vitrinStokSecenegi(site, { ...ayarlar, tukenenUrun: "gizle" }),
    );
    expect(new Set(goster)).toEqual(
      new Set([h.urun.varyantli, h.urun.takipsiz, h.urun.yabanci, h.urun.satilir]),
    );
    expect(gizle).toEqual([h.urun.satilir]);
  });

  it("ürün sayfası: fiyatsız birleşim satılamaz, ürünün genel durumu 'tükendi'", async () => {
    const h = await hazirla();
    const veri = await urunSayfasiVerisi(h.vt, site, h.urun.varyantli);
    expect(veri?.genel).toMatchObject({ satilabilir: false, stok: { tur: "tukendi" } });
    expect(veri?.birimler.find((birim) => birim.kimlik === h.birim.a)).toMatchObject({
      satilabilir: false,
      stok: { tur: "tukendi" },
    });
    const basit = await urunSayfasiVerisi(h.vt, site, h.urun.fiyatsiz);
    expect(basit?.genel).toMatchObject({ satilabilir: false, stok: { tur: "tukendi" } });
  });
});
