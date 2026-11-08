// Başlangıç kataloğu gerçek veritabanıyla (kart 0084): boş veritabanında servislerle bir kez yazılması,
// ikinci çalıştırmanın ve kurulu kataloğun (silinmiş satır dahil) hiçbir şey değiştirmemesi, aynı anda
// iki sürecin tek yazımı, bir parça yazılamayınca hiçbir parçanın kalmaması, değişiklik kaydı ile fiyat
// ve stok geçmişi. Örnek katalog cekirdek/ayar-semasi/testler/ornek-siteler/katalog-dolu klasöründedir;
// sitelerin kendi kataloğunun durumları sitenin testindedir (siteler/<kod-adi>/testler/).
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { count, eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { type Site, siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { etiketler } from "../../etiket/model.ts";
import { birimFiyatlari, fiyatGecmisi } from "../../fiyat/model.ts";
import { siteninFiyatServisi } from "../../fiyat/servis.ts";
import { kategoriler } from "../../kategori/model.ts";
import { kategoriEkle, kategorileriOku } from "../../kategori/servis.ts";
import { markalar } from "../../marka/model.ts";
import { birimStoklari, stokGecmisi } from "../../stok/model.ts";
import { stokServisi } from "../../stok/servis.ts";
import { siteninVergiServisi } from "../../vergi/servis.ts";
import { baslangicKatalogYazari, katalogBaslangiciniKur } from "../baslangic.ts";
import { bosKatalog, type KatalogBaslangici } from "../baslangic-semasi.ts";
import { urunBirimleri, urunler } from "../model.ts";
import { siteninUrunServisi } from "../servis.ts";

const ornekSite = siteKlasorunuOku(
  join(
    import.meta.dirname,
    "..",
    "..",
    "..",
    "ayar-semasi",
    "testler",
    "ornek-siteler",
    "katalog-dolu",
  ),
);
const katalogla = (degistir: (katalog: KatalogBaslangici) => void): Site => {
  const katalog = structuredClone(ornekSite.katalogBaslangici);
  degistir(katalog);
  return { ...ornekSite, katalogBaslangici: katalog };
};
const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

const silinecekler: (() => Promise<void>)[] = [];
const siteAc = async (): Promise<Veritabani> => {
  const site = await denemeSitesiAc("katalog");
  silinecekler.push(site.sil);
  return site.vt;
};
afterEach(async () => {
  await Promise.all(silinecekler.splice(0).map((sil) => sil()));
});

const tablolar = {
  urunler,
  urunBirimleri,
  kategoriler,
  markalar,
  etiketler,
  birimFiyatlari,
  fiyatGecmisi,
  birimStoklari,
  stokGecmisi,
  degisiklikKayitlari,
};
const sayilar = async (vt: Veritabani) =>
  Object.fromEntries(
    await Promise.all(
      Object.entries(tablolar).map(async ([ad, tablo]) => {
        const [satir] = await vt.select({ sayi: count() }).from(tablo);
        return [ad, satir?.sayi ?? 0] as const;
      }),
    ),
  );
const bos = Object.fromEntries(Object.keys(tablolar).map((ad) => [ad, 0]));

const urunKimligi = async (vt: Veritabani, adresAdi: string) => {
  const [satir] = await vt
    .select({ kimlik: urunler.kimlik })
    .from(urunler)
    .where(eq(urunler.adres_adi, adresAdi));
  if (satir === undefined) throw new Error(`${adresAdi} yok.`);
  return satir.kimlik;
};

describe("boş veritabanında", () => {
  it("katalog servislerle yazılır: bağlantılar, fiyat, stok, vergi sınıfı", async () => {
    const vt = await siteAc();
    expect(await katalogBaslangiciniKur(vt, ornekSite)).toBe(true);

    const kategoriListesi = await kategorileriOku(vt);
    expect(kategoriListesi.map((k) => [k.ad, k.adresAdi])).toEqual([
      ["Birinci Bölüm", "birinci"],
      ["İkinci Bölüm", "ikinci"],
    ]);
    const urunServisi = siteninUrunServisi(ornekSite);
    const ana = await urunServisi.urunuOku(vt, await urunKimligi(vt, "deneme-urunu"));
    const vergisiz = await urunServisi.urunuOku(vt, await urunKimligi(vt, "vergisiz-urun"));
    if (ana === undefined || vergisiz === undefined) throw new Error("Ürün okunamadı.");
    const genel = (await siteninVergiServisi(ornekSite).tabloyuOku(vt)).find(
      (s) => s.ad === "Genel",
    );
    expect(ana).toMatchObject({
      ad: "Deneme Ürünü",
      durum: "yayinda",
      vergiSinifi: genel?.kimlik,
      kategoriler: kategoriListesi.map((k) => k.kimlik).toSorted(),
      ilgiliUrunler: [vergisiz.kimlik],
    });
    expect(ana.marka).not.toBeNull();
    expect(ana.etiketler).toHaveLength(1);
    expect(vergisiz).toMatchObject({ durum: "taslak", vergiSinifi: null, stokTakibi: false });

    const birim = ana.birimler[0]?.kimlik ?? "";
    expect(await siteninFiyatServisi(ornekSite).fiyatOku(vt, birim)).toMatchObject({
      satisFiyati: 1000,
      indirimliFiyat: 800,
      paraBirimi: "XTS",
    });
    expect((await stokServisi().stoklariOku(vt, [birim])).get(birim)).toEqual({
      miktar: 3,
      takip: true,
    });
    const [gecmis] = await vt.select().from(stokGecmisi);
    expect(gecmis).toMatchObject({ onceki_miktar: 0, sonraki_miktar: 3, sebep: "yeni-mal" });

    // Fiyatsız ve stoksuz ürünün fiyatı ve stok satırı yoktur.
    const vergisizBirim = vergisiz.birimler[0]?.kimlik ?? "";
    expect(await siteninFiyatServisi(ornekSite).fiyatOku(vt, vergisizBirim)).toBeUndefined();
    expect(await sayilar(vt)).toMatchObject({ birimFiyatlari: 1, fiyatGecmisi: 1, stokGecmisi: 1 });
  });

  it("her yazım değişiklik kaydına başlangıç kataloğu adıyla girer", async () => {
    const vt = await siteAc();
    await katalogBaslangiciniKur(vt, ornekSite);
    const kayitlar = await vt.select().from(degisiklikKayitlari);
    const katalogKayitlari = kayitlar.filter((k) => k.kim_adi === "baslangic-katalog");
    expect(baslangicKatalogYazari).toEqual({ tur: "sistem", ad: "baslangic-katalog" });
    expect(katalogKayitlari.map((k) => k.islem).toSorted()).toEqual(
      [
        "etiket.eklendi",
        "fiyat.degisti",
        "kategori.eklendi",
        "kategori.eklendi",
        "marka.eklendi",
        "stok.duzeltildi",
        "urun.degisti",
        "urun.eklendi",
        "urun.eklendi",
      ].toSorted(),
    );
    // Geri kalan kayıtlar vergi tablosunun başlangıcıdır (karar 0060).
    expect(
      kayitlar
        .filter((k) => k.kim_adi !== "baslangic-katalog")
        .every((k) => k.islem === "vergi.baslangic"),
    ).toBe(true);
  });

  it("boş katalog hiçbir şey yazmaz", async () => {
    const vt = await siteAc();
    expect(
      await katalogBaslangiciniKur(vt, { ...ornekSite, katalogBaslangici: bosKatalog() }),
    ).toBe(false);
    expect(await sayilar(vt)).toEqual(bos);
  });
});

describe("bir kez", () => {
  it("ikinci çalıştırma hiçbir şey değiştirmez", async () => {
    const vt = await siteAc();
    expect(await katalogBaslangiciniKur(vt, ornekSite)).toBe(true);
    const once = await sayilar(vt);
    expect(await katalogBaslangiciniKur(vt, ornekSite)).toBe(false);
    expect(await sayilar(vt)).toEqual(once);
  });

  it("kurulu katalog yazılmaz: yalnız bir kategori, ya da silinmiş tek ürün", async () => {
    const kategorili = await siteAc();
    await kategoriEkle(kategorili, yonetici(), { ad: "Elle açılan" });
    expect(await katalogBaslangiciniKur(kategorili, ornekSite)).toBe(false);
    expect(await sayilar(kategorili)).toMatchObject({ urunler: 0, kategoriler: 1 });

    const silinmis = await siteAc();
    const servis = siteninUrunServisi(ornekSite);
    const kimlik = await servis.urunEkle(silinmis, yonetici(), {
      ad: "Silinecek",
      vergiSinifi: null,
    });
    await servis.urunSil(silinmis, yonetici(), kimlik);
    expect(await katalogBaslangiciniKur(silinmis, ornekSite)).toBe(false);
    expect(await sayilar(silinmis)).toMatchObject({ urunler: 1, kategoriler: 0, markalar: 0 });
  });

  it("panelden açılmakta olan kategori kataloğa karışmaz: kurulu mu sorusu kilitlerden sonra", async () => {
    const vt = await siteAc();
    let hazir: () => void = () => {};
    let birak: () => void = () => {};
    const kategoriYazildi = new Promise<void>((coz) => {
      hazir = coz;
    });
    const bitir = new Promise<void>((coz) => {
      birak = coz;
    });
    // Panelin işlemi kategoriyi yazmış, henüz kaydetmemiş.
    const panel = vt.transaction(async (islem) => {
      await kategoriEkle(islem, yonetici(), { ad: "Panelden" });
      hazir();
      await bitir;
    });
    await kategoriYazildi;
    const katalog = katalogBaslangiciniKur(vt, ornekSite);
    // Katalog kilitte bekler; panel o arada kaydeder.
    await new Promise((coz) => setTimeout(coz, 500));
    birak();
    await panel;
    expect(await katalog).toBe(false);
    expect(await sayilar(vt)).toMatchObject({ kategoriler: 1, urunler: 0, markalar: 0 });
  });

  it("aynı anda açılan iki süreçten yalnız biri yazar", async () => {
    const vt = await siteAc();
    const sonuclar = await Promise.all([
      katalogBaslangiciniKur(vt, ornekSite),
      katalogBaslangiciniKur(vt, ornekSite),
      katalogBaslangiciniKur(vt, ornekSite),
    ]);
    expect(sonuclar.filter(Boolean)).toHaveLength(1);
    expect(await sayilar(vt)).toMatchObject({
      urunler: 2,
      kategoriler: 2,
      markalar: 1,
      etiketler: 1,
    });
  });
});

describe("yarım katalog kalmaz", () => {
  it("bir ürün yazılamazsa (aynı stok kodu) hiçbir parça yazılmaz, sonra yeniden denenebilir", async () => {
    const vt = await siteAc();
    const bozuk = katalogla((katalog) => {
      for (const urun of katalog.urunler) urun.stokKodu = "AYNI-KOD";
    });
    await expect(katalogBaslangiciniKur(vt, bozuk)).rejects.toMatchObject({ kod: "cakisma" });
    expect(await sayilar(vt)).toEqual(bos);
    expect(await katalogBaslangiciniKur(vt, ornekSite)).toBe(true);
  });

  it("son adım (ilgili ürünler) yazılamazsa da hiçbir parça kalmaz", async () => {
    const vt = await siteAc();
    const bozuk = katalogla((katalog) => {
      const [ilk] = katalog.urunler;
      // Şemayı atlayan bir girdi: servis de reddeder (site doğrulaması bunu dosyada yakalar).
      if (ilk !== undefined) ilk.ilgiliUrunler = [ilk.adresAdi];
    });
    await expect(katalogBaslangiciniKur(vt, bozuk)).rejects.toMatchObject({ kod: "dogrulama" });
    expect(await sayilar(vt)).toEqual(bos);
  });

  it("vergi sınıfı veritabanında yoksa (silinmiş) hiçbir parça yazılmaz", async () => {
    const vt = await siteAc();
    const vergi = siteninVergiServisi(ornekSite);
    const [genel] = await vergi.tabloyuOku(vt);
    if (genel === undefined) throw new Error("Vergi sınıfı yok.");
    await vergi.sinifSil(vt, yonetici(), genel.kimlik);
    const once = await sayilar(vt);
    await expect(katalogBaslangiciniKur(vt, ornekSite)).rejects.toThrow(/vergi sınıfı yok: Genel/);
    expect(await sayilar(vt)).toEqual(once);
    expect(once).toMatchObject({ urunler: 0, kategoriler: 0 });
  });
});
